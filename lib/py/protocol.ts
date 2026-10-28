import type { RunOptions, RunResult } from "./core";

export type ToWorker =
  | { type: "init"; indexURL: string }
  | { type: "mount"; id: number; name: string; files: Record<string, string> }
  | { type: "run"; id: number; opts: RunOptions };

export type FromWorker =
  | { type: "stage"; stage: string; ms: number }
  | { type: "ready"; ms: number }
  | { type: "done"; id: number; result: RunResult }
  | { type: "failed"; id?: number; message: string };
