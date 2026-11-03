/// <reference lib="webworker" />
// Training Grounds worker: runs one session off the main thread and streams epochs back.
import { runSession, type SessionEvent, type SessionRequest } from "./session";

export type TrainToWorker = { type: "run"; req: SessionRequest };
export type TrainFromWorker = SessionEvent | { type: "failed"; message: string };

const ctx = self as unknown as DedicatedWorkerGlobalScope;
ctx.onmessage = (e: MessageEvent<TrainToWorker>) => {
  if (e.data.type !== "run") return;
  try {
    runSession(e.data.req, (ev) => ctx.postMessage(ev satisfies TrainFromWorker));
  } catch (err) {
    ctx.postMessage({ type: "failed", message: String(err) } satisfies TrainFromWorker);
  }
};
