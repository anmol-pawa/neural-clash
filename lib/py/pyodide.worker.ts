// Bundled to public/pyodide/worker.mjs by scripts/build-py-worker.mjs (not by Next): Pyodide 314
// refuses classic workers, and Next/Turbopack only emits classic ones.
/// <reference lib="webworker" />
import { PyCore, type PyodideLike } from "./core";
import type { FromWorker, ToWorker } from "./protocol";

const post = (m: FromWorker) => self.postMessage(m);
let core: PyCore | null = null;
const t0 = Date.now();

async function init(indexURL: string) {
  post({ type: "stage", stage: "runtime", ms: Date.now() - t0 });
  const mod = await import(/* webpackIgnore: true */ `${indexURL}pyodide.mjs`);
  const py = (await mod.loadPyodide({ indexURL })) as PyodideLike;
  core = new PyCore(py);
  await core.init((stage) => post({ type: "stage", stage, ms: Date.now() - t0 }));
  post({ type: "ready", ms: Date.now() - t0 });
}

self.onmessage = async (e: MessageEvent<ToWorker>) => {
  const m = e.data;
  try {
    if (m.type === "init") await init(m.indexURL);
    else if (m.type === "mount") core!.mountPackage(m.name, m.files);
    else if (m.type === "run") post({ type: "done", id: m.id, result: await core!.run(m.opts) });
  } catch (err) {
    post({ type: "failed", id: "id" in m ? m.id : undefined, message: err instanceof Error ? err.message : String(err) });
  }
};
