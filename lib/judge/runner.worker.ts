// Bundled to public/clang/runner.mjs. One short-lived worker per test run: the client terminates it on timeout,
// which is the only way to stop a synchronous wasm loop, and a fresh worker means no state leaks between runs.
/// <reference lib="webworker" />
import type { FromRunner, ToRunner } from "./protocol";
import { runWasm } from "./wasi";

self.onmessage = async (e: MessageEvent<ToRunner>) => {
  try {
    const outcome = await runWasm(e.data.wasm, e.data.input, { maxOutputBytes: e.data.maxOutputBytes });
    self.postMessage({ type: "done", outcome } satisfies FromRunner);
  } catch (err) {
    self.postMessage({ type: "failed", message: err instanceof Error ? err.message : String(err) } satisfies FromRunner);
  }
};
