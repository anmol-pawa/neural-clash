// Compile-and-run core for the in-browser C++ judge. DOM-free: the browser worker and the
// Node tests both call it. clang comes from @yowasp/clang (wasm32-wasip1 with libc++).
import { BITS_STDCXX_H } from "./stdcxx";
import { ExitSignal, makeWasiImports, type WasiIO } from "./wasi";

export type Verdict = "AC" | "WA" | "TLE" | "RE" | "CE";

export interface CompileOptions {
  optimize?: "O1" | "O2";
  std?: "c++17" | "c++20";
}

export type CompileResult =
  | { ok: true; wasm: Uint8Array; diagnostics: string }
  | { ok: false; diagnostics: string };

export interface RunOutcome {
  verdict: "OK" | "TLE" | "RE";
  stdout: string;
  stderr: string;
  exitCode: number;
  wallMs: number;
  reason?: string;
}

// The subset of @yowasp/clang we use; injected so tests and workers load it their own way.
export type ClangRunner = (
  args: string[],
  files: Record<string, unknown>,
  options?: { stderr?: (b: Uint8Array | null) => void; stdout?: (b: Uint8Array | null) => void },
) => Promise<Record<string, unknown>>;

const decoder = new TextDecoder();
const join = (parts: Uint8Array[]) => parts.map((p) => decoder.decode(p, { stream: true })).join("");

/** `-fno-exceptions` is required: this libc++ build has no libc++abi exception runtime. */
export async function compileCpp(
  runClang: ClangRunner,
  source: string,
  opts: CompileOptions = {},
): Promise<CompileResult> {
  const chunks: Uint8Array[] = [];
  const collect = (b: Uint8Array | null) => {
    if (b) chunks.push(b.slice());
  };
  const args = [
    "clang++", `-std=${opts.std ?? "c++20"}`, `-${opts.optimize ?? "O2"}`, "-fno-exceptions",
    "-Wall", "-Wextra", "-Ijudge_inc", "main.cpp", "-o", "main.wasm",
  ];
  const files = { "main.cpp": source, judge_inc: { bits: { "stdc++.h": BITS_STDCXX_H } } };
  try {
    const out = await runClang(args, files, { stderr: collect, stdout: collect });
    const diagnostics = join(chunks);
    const wasm = out["main.wasm"];
    if (wasm instanceof Uint8Array) return { ok: true, wasm, diagnostics };
    return { ok: false, diagnostics: diagnostics || "compiler produced no output" };
  } catch (e) {
    const diagnostics = join(chunks);
    return { ok: false, diagnostics: diagnostics || String(e) };
  }
}

/** Runs a compiled module synchronously. The caller enforces the timeout (worker.terminate()). */
export function runWasm(wasm: Uint8Array, stdin = ""): RunOutcome {
  const io: WasiIO = { stdout: [], stderr: [] };
  const started = performance.now();
  const memoryRef: { current?: WebAssembly.Memory } = {};
  const compiled = new WebAssembly.Module(wasm as BufferSource);
  const wasi = makeWasiImports(new TextEncoder().encode(stdin), io, () => memoryRef.current!);
  const instance = new WebAssembly.Instance(compiled, { wasi_snapshot_preview1: wasi });
  memoryRef.current = instance.exports.memory as WebAssembly.Memory;
  let exitCode = 0;
  let reason: string | undefined;
  try {
    (instance.exports._start as () => void)();
  } catch (e) {
    if (e instanceof ExitSignal) exitCode = e.code;
    else {
      exitCode = 134;
      reason = friendlyTrap(e);
    }
  }
  const stderr = join(io.stderr);
  const wallMs = performance.now() - started;
  const failed = exitCode !== 0;
  return { verdict: failed ? "RE" : "OK", stdout: join(io.stdout), stderr, exitCode, wallMs, reason: failed ? (reason ?? "non-zero exit code") : undefined };
}

export function friendlyTrap(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/call stack|stack overflow/i.test(msg)) return "stack overflow: recursion too deep";
  if (/out of bounds/i.test(msg)) return "memory access out of bounds";
  if (/unreachable/i.test(msg)) return "abort or failed assertion (std::abort, assert, or an uncaught library error)";
  if (/divide by zero|integer divide/i.test(msg)) return "integer division by zero";
  return msg;
}
