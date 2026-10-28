import { parseClangOutput, type Diagnostic } from "./diagnostics";
import { CLANG_FLAGS, STDCXX_SHIM } from "./headers";

/** The slice of `@yowasp/clang`'s runClang we use; injected so Node tests and the worker share this code. */
export type RunClang = (
  args: string[],
  files: Record<string, unknown>,
  options?: { stderr?: (b: Uint8Array | null) => void; fetchProgress?: (e: { totalLength: number; doneLength: number }) => void },
) => Promise<Record<string, unknown>>;

export type CompileResult = { ok: true; wasm: Uint8Array; warnings: Diagnostic[]; ms: number } | { ok: false; diagnostics: Diagnostic[]; raw: string; ms: number };

export async function compileCpp(runClang: RunClang, source: string, progress?: (done: number, total: number) => void): Promise<CompileResult> {
  const t0 = performance.now();
  let raw = "";
  const dec = new TextDecoder();
  try {
    const files = await runClang(["clang++", ...CLANG_FLAGS, "main.cpp", "-o", "main.wasm"], { "main.cpp": source, inc: { bits: { "stdc++.h": STDCXX_SHIM } } }, {
      stderr: (b) => {
        if (b) raw += dec.decode(b);
      },
      fetchProgress: progress && ((e) => progress(e.doneLength, e.totalLength)),
    });
    return { ok: true, wasm: files["main.wasm"] as Uint8Array, warnings: parseClangOutput(raw), ms: Math.round(performance.now() - t0) };
  } catch (e) {
    const diagnostics = parseClangOutput(raw);
    // A toolchain failure (not a user error) has no diagnostics: surface it instead of a blank Compile Error.
    if (diagnostics.length === 0) throw new Error(raw.trim() || (e instanceof Error ? e.message : String(e)));
    return { ok: false, diagnostics, raw, ms: Math.round(performance.now() - t0) };
  }
}
