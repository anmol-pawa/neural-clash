import { join } from "node:path";
import { loadPyodide } from "pyodide";
import { PyCore, type PyodideLike } from "@/lib/py/core";

let cached: Promise<PyCore> | null = null;

/** One shared Node Pyodide + PyCore for the whole test file (loading takes ~2 s). */
export function nodeCore(): Promise<PyCore> {
  cached ??= (async () => {
    const py = (await loadPyodide({ indexURL: join(process.cwd(), "public", "pyodide") })) as unknown as PyodideLike;
    const core = new PyCore(py);
    await core.init();
    return core;
  })();
  return cached;
}
