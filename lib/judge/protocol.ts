import type { CompileResult } from "./compile";
import type { RunOutcome } from "./wasi";

export type ToClang = { type: "init" } | { type: "compile"; id: number; source: string };
export type FromClang =
  | { type: "progress"; done: number; total: number }
  | { type: "ready"; ms: number }
  | { type: "compiled"; id: number; result: CompileResult }
  | { type: "failed"; id?: number; message: string };

export type ToRunner = { type: "run"; wasm: Uint8Array; input: string; maxOutputBytes?: number };
export type FromRunner = { type: "done"; outcome: RunOutcome } | { type: "failed"; message: string };
