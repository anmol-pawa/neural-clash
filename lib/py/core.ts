// Runtime logic shared by the browser worker and the Node tests. It only needs the
// small slice of the Pyodide API below, so it has no DOM or worker dependency.
import { NC_TEST_PY } from "./nc_test.py.gen";

export interface PyodideLike {
  loadPackage(names: string | string[]): Promise<unknown>;
  runPython(code: string, options?: { globals?: unknown }): unknown;
  runPythonAsync(code: string, options?: { globals?: unknown }): Promise<unknown>;
  setStdout(options: { batched: (line: string) => void }): void;
  setStderr(options: { batched: (line: string) => void }): void;
  globals: { get(name: string): unknown };
  FS: { mkdirTree(path: string): void; writeFile(path: string, data: string): void };
  toPy(obj: unknown): unknown;
  pyimport(name: string): unknown;
}

export interface TestResult {
  name: string;
  ok: boolean;
  message: string;
  line?: number;
}

export interface RunOptions {
  /** the player's code, executed as ``__main__`` in a fresh namespace */
  code: string;
  /** hidden/visible tests, executed in the same namespace after ``code`` */
  tests?: string;
  /** limit for numpy allocations (elements); 0 disables the guard */
  maxElements?: number;
}

export interface RunResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  /** set when the player's code (or the tests module) raised outside a test */
  error?: string;
  errorLine?: number;
  tests: TestResult[];
  ms: number;
}

const PKG_ROOT = "/home/pyodide/pkgs";
const SITE = "/home/pyodide/site";

/** Python-side runner. Called with JSON in and out so no PyProxy handles leak. */
const RUNNER = `
import json, sys, traceback, importlib
def __nc_run(payload):
    import nc_test
    req = json.loads(payload)
    for m in [m for m in list(sys.modules) if m.split(".")[0] in __nc_mounted]:
        del sys.modules[m]
    importlib.invalidate_caches()
    if req["max"]:
        nc_test.guard_arrays(req["max"])
    ns = {"__name__": "__main__"}
    out = {"error": None, "errorLine": None, "tests": []}
    def fail(exc):
        out["error"] = f"{type(exc).__name__}: {exc}"
        tb = [f for f in traceback.extract_tb(exc.__traceback__) if f.filename == "<player>"]
        out["errorLine"] = tb[-1].lineno if tb else None
    try:
        exec(compile(req["code"], "<player>", "exec"), ns)
        if req["tests"]:
            tns = dict(ns)
            exec(compile(req["tests"], "<tests>", "exec"), tns)
            out["tests"] = nc_test.run_tests(tns)
    except BaseException as exc:
        fail(exc)
    return json.dumps(out)
__nc_mounted = set()
`;

export class PyCore {
  private ready = false;
  private mounted = new Set<string>();
  constructor(private py: PyodideLike) {}

  /** numpy + harness. Reports coarse stages so the UI can show progress. */
  async init(onStage: (stage: string) => void = () => {}): Promise<void> {
    if (this.ready) return;
    onStage("numpy");
    await this.py.loadPackage("numpy");
    onStage("harness");
    this.py.FS.mkdirTree(SITE);
    this.py.FS.writeFile(`${SITE}/nc_test.py`, NC_TEST_PY);
    this.py.runPython(`import sys\nif "${SITE}" not in sys.path: sys.path.insert(0, "${SITE}")\n${RUNNER}`);
    this.py.runPython("import numpy, nc_test");
    this.ready = true;
    onStage("ready");
  }

  /** Mounts files as an importable package (the player's `latent` framework, or the reference). */
  mountPackage(name: string, files: Record<string, string>): void {
    const dir = `${PKG_ROOT}/${name}`;
    this.py.FS.mkdirTree(dir);
    for (const [file, text] of Object.entries(files)) {
      if (file.includes("..") || file.startsWith("/")) throw new Error(`bad path ${file}`);
      const full = `${dir}/${file}`;
      this.py.FS.mkdirTree(full.slice(0, full.lastIndexOf("/")));
      this.py.FS.writeFile(full, text);
    }
    this.py.runPython(`import sys\nif "${PKG_ROOT}" not in sys.path: sys.path.insert(0, "${PKG_ROOT}")\n__nc_mounted.add(${JSON.stringify(name)})`);
    this.mounted.add(name);
  }

  async run(opts: RunOptions): Promise<RunResult> {
    if (!this.ready) throw new Error("PyCore.init() has not completed");
    const stdout: string[] = [];
    const stderr: string[] = [];
    this.py.setStdout({ batched: (l) => stdout.push(l) });
    this.py.setStderr({ batched: (l) => stderr.push(l) });
    const t0 = Date.now();
    const payload = JSON.stringify({ code: opts.code, tests: opts.tests ?? "", max: opts.maxElements ?? 5_000_000 });
    const raw = this.py.runPython(`__nc_run(${JSON.stringify(payload)})`) as string;
    const out = JSON.parse(raw) as { error: string | null; errorLine: number | null; tests: TestResult[] };
    const ok = out.error === null && out.tests.every((t) => t.ok);
    return {
      ok,
      stdout: stdout.join("\n"),
      stderr: stderr.join("\n"),
      error: out.error ?? undefined,
      errorLine: out.errorLine ?? undefined,
      tests: out.tests,
      ms: Date.now() - t0,
    };
  }
}
