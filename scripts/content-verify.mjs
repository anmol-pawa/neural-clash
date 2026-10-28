// Native verification of every content package (ARCH §4): python3 + numpy for Lab modules, g++ for problems.
// Usage: node scripts/content-verify.mjs [contentDir]   (exit code 1 on any failure)
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const NC_TEST_DIR = join(ROOT, "lib", "py");
const COMPILE_FLAGS = ["-std=c++17", "-O2", "-Wall", "-Wextra"];
const RUN_PYTHON = `
import json, sys
sys.path.insert(0, sys.argv[1])
import nc_test
ns = {"__name__": "__main__"}
for path in sys.argv[2:]:
    exec(compile(open(path).read(), path, "exec"), ns)
print(json.dumps(nc_test.run_tests(ns)))
`;

/** First python3 that can import numpy ($PYTHON wins; some images ship numpy only for /usr/bin/python3). */
export function findPython() {
  for (const bin of [process.env.PYTHON, "python3", "/usr/bin/python3"].filter(Boolean)) {
    if (spawnSync(bin, ["-c", "import numpy"], { encoding: "utf8" }).status === 0) return bin;
  }
  throw new Error("no python3 with numpy found: pip install --break-system-packages -r requirements-dev.txt");
}

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const listFiles = (dir, ext) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(ext)).sort() : []);

/** Runs `solution` then `tests` in one namespace; returns the nc_test result list. */
export function runPythonTests(python, solutionPath, testsPath) {
  const r = spawnSync(python, ["-I", "-c", RUN_PYTHON, NC_TEST_DIR, solutionPath, testsPath], { encoding: "utf8", timeout: 60_000 });
  if (r.status !== 0) return [{ name: "<harness>", ok: false, message: (r.stderr || r.error?.message || "python failed").trim().split("\n").pop() }];
  return JSON.parse(r.stdout.trim().split("\n").pop());
}

function need(errors, cond, msg) {
  if (!cond) errors.push(msg);
  return cond;
}

export function verifyLab(python, dir) {
  const errors = [];
  const meta = readJson(join(dir, "meta.json"));
  const id = meta.id ?? dir;
  for (const f of ["lesson.md", "spec.py", "reference/solution.py", "tests_visible.py", "tests_hidden.py"]) need(errors, existsSync(join(dir, f)), `${id}: missing ${f}`);
  need(errors, typeof meta.title === "string" && meta.language === "python", `${id}: meta needs title and language "python"`);
  const wrongs = listFiles(join(dir, "wrong"), ".py");
  need(errors, wrongs.length >= 2, `${id}: needs at least two wrong/*.py (has ${wrongs.length})`);
  for (const w of wrongs) need(errors, meta.wrong?.[w], `${id}: wrong/${w} is not documented in meta.wrong`);
  for (const w of Object.keys(meta.wrong ?? {})) need(errors, wrongs.includes(w), `${id}: meta.wrong lists ${w} but the file is missing`);
  if (errors.length) return errors;

  const ref = join(dir, "reference", "solution.py");
  for (const suite of ["tests_visible.py", "tests_hidden.py"]) {
    const results = runPythonTests(python, ref, join(dir, suite));
    need(errors, results.length > 0, `${id}: ${suite} has no tests`);
    for (const t of results.filter((t) => !t.ok)) errors.push(`${id}: reference fails ${suite}::${t.name}: ${t.message}`);
  }
  // The starter must not already pass: it would give the level away.
  const starter = runPythonTests(python, join(dir, "spec.py"), join(dir, "tests_hidden.py"));
  need(errors, starter.every((t) => !t.ok), `${id}: the unmodified spec.py passes some hidden tests`);
  for (const w of wrongs) {
    const results = runPythonTests(python, join(dir, "wrong", w), join(dir, "tests_hidden.py"));
    need(errors, results.some((t) => !t.ok), `${id}: wrong/${w} passes every hidden test (the tests are too weak)`);
  }
  return errors;
}

function sh(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 64 << 20, ...opts });
}

function compile(src, out, errors, label) {
  const r = sh("g++", [...COMPILE_FLAGS, src, "-o", out]);
  if (r.status !== 0) errors.push(`${label}: does not compile:\n${r.stderr.split("\n").slice(0, 6).join("\n")}`);
  return r.status === 0;
}

/** Run a binary; returns { out } or { tle: true } or { crash: message }. */
function runBinary(bin, input, limitMs) {
  const r = sh(bin, [], { input, timeout: limitMs });
  if (r.error?.code === "ETIMEDOUT") return { tle: true };
  if (r.status !== 0) return { crash: `exit ${r.status}${r.signal ? ` (${r.signal})` : ""}` };
  return { out: r.stdout };
}

const norm = (s, mode) => (mode === "tokens" ? s.split(/\s+/).filter(Boolean).join(" ") : s.replace(/\s+$/, "").split("\n").map((l) => l.replace(/\s+$/, "")).join("\n"));

export function verifyProblem(python, dir) {
  const errors = [];
  const meta = readJson(join(dir, "meta.json"));
  const id = meta.id ?? dir;
  for (const f of ["statement.md", "editorial.md", "solution.cpp", "brute.cpp", "gen.py"]) need(errors, existsSync(join(dir, f)), `${id}: missing ${f}`);
  need(errors, meta.hints?.length === 3, `${id}: needs a 3-rung hint ladder`);
  need(errors, meta.complexity?.time && meta.complexity?.space, `${id}: needs complexity.time and complexity.space`);
  need(errors, ["lines", "tokens"].includes(meta.compare), `${id}: compare must be "lines" or "tokens"`);
  for (const g of ["sample", "edge", "random", "perf"]) need(errors, meta.groups?.[g]?.length > 0, `${id}: group "${g}" has no seeds`);
  const wrongs = listFiles(join(dir, "wrong"), ".cpp");
  need(errors, wrongs.length >= 2, `${id}: needs at least two wrong/*.cpp`);
  need(errors, !(meta.difficulty === "M" || meta.difficulty === "H") || Object.values(meta.wrongExpect ?? {}).includes("TLE"), `${id}: mediums and hards need a wrong solution that must TLE`);
  for (const w of wrongs) need(errors, meta.wrongExpect?.[w], `${id}: wrong/${w} has no wrongExpect entry`);
  if (errors.length) return errors;

  const tmp = mkdtempSync(join(tmpdir(), "nc-verify-"));
  try {
    const ok = [
      compile(join(dir, "solution.cpp"), join(tmp, "ref"), errors, `${id}/solution.cpp`),
      compile(join(dir, "brute.cpp"), join(tmp, "brute"), errors, `${id}/brute.cpp`),
    ];
    const wrongBins = wrongs.map((w) => (compile(join(dir, "wrong", w), join(tmp, w), errors, `${id}/wrong/${w}`) ? w : null));
    if (!ok.every(Boolean)) return errors;

    const limit = meta.timeLimitMs ?? 1000;
    const verdicts = Object.fromEntries(wrongs.map((w) => [w, new Set()]));
    for (const [group, seeds] of Object.entries(meta.groups)) {
      for (const seed of seeds) {
        const gen = sh(python, ["-I", join(dir, "gen.py"), group, String(seed)]);
        if (gen.status !== 0) {
          errors.push(`${id}: generator failed for ${group}/${seed}: ${gen.stderr.trim()}`);
          continue;
        }
        const input = gen.stdout;
        const label = `${id}: ${group}/${seed}`;
        const expected = runBinary(join(tmp, "ref"), input, limit);
        if (!expected.out) {
          errors.push(`${label}: reference ${expected.tle ? "exceeded the time limit" : (expected.crash ?? "produced no output")}`);
          continue;
        }
        if (group !== "perf") {
          const brute = runBinary(join(tmp, "brute"), input, 20_000);
          if (norm(brute.out ?? "", meta.compare) !== norm(expected.out, meta.compare)) errors.push(`${label}: reference and brute force disagree`);
        }
        for (const w of wrongBins.filter(Boolean)) {
          const got = runBinary(join(tmp, w), input, limit);
          verdicts[w].add(got.tle ? "TLE" : got.crash ? "RE" : norm(got.out, meta.compare) === norm(expected.out, meta.compare) ? "AC" : "WA");
        }
      }
    }
    for (const w of wrongs) {
      const want = meta.wrongExpect[w];
      need(errors, verdicts[w].has(want), `${id}: wrong/${w} should earn ${want} on some case but got {${[...verdicts[w]].join(", ")}}`);
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  return errors;
}

/** Verifies everything under `contentDir`; returns { checked: string[], errors: string[] }. */
export function verifyAll(contentDir = join(ROOT, "content"), log = () => {}) {
  const python = findPython();
  const checked = [];
  const errors = [];
  for (const [kind, fn] of [["labs", verifyLab], ["problems", verifyProblem]]) {
    const base = join(contentDir, kind);
    if (!existsSync(base)) continue;
    for (const name of readdirSync(base).sort()) {
      const dir = join(base, name);
      if (!existsSync(join(dir, "meta.json"))) continue;
      const errs = fn(python, dir);
      checked.push(`${kind}/${name}`);
      log(`${errs.length ? "FAIL" : "ok  "} ${kind}/${name}`);
      errors.push(...errs);
    }
  }
  if (checked.length === 0) errors.push(`no content packages found under ${contentDir}`);
  return { checked, errors };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { errors } = verifyAll(process.argv[2] ? resolve(process.argv[2]) : undefined, console.log);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(errors.length ? 1 : 0);
}
