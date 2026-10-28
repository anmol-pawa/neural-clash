// Bundled to public/clang/clang.worker.mjs by scripts/fetch-clang.mjs (not by Next): the clang wasm files
// sit next to the bundle and are found through import.meta.url.
/// <reference lib="webworker" />
import { compileCpp, type RunClang } from "./compile";
import type { FromClang, ToClang } from "./protocol";

const post = (m: FromClang) => self.postMessage(m);
let runClang: RunClang | null = null;
const t0 = Date.now();

self.onmessage = async (e: MessageEvent<ToClang>) => {
  const m = e.data;
  try {
    if (m.type === "init") {
      const mod = await import("@yowasp/clang");
      // the package's .d.ts omits runClang, which the bundle (and its README) export
      runClang = (mod as unknown as { runClang: RunClang }).runClang;
      // a tiny compile warms up and instantiates the toolchain so the first real submission isn't slow
      await compileCpp(runClang, "int main() {}", (done, total) => post({ type: "progress", done, total }));
      post({ type: "ready", ms: Date.now() - t0 });
    } else if (m.type === "compile") {
      post({ type: "compiled", id: m.id, result: await compileCpp(runClang!, m.source) });
    }
  } catch (err) {
    post({ type: "failed", id: "id" in m ? m.id : undefined, message: err instanceof Error ? err.message : String(err) });
  }
};
