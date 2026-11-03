import type { SessionEvent, SessionRequest } from "./session";
import type { TrainFromWorker, TrainToWorker } from "./train.worker";

/** Starts a run in a fresh worker; returns a cancel function. A new run cancels the old one by terminating its worker. */
export function startTraining(req: SessionRequest, onEvent: (e: SessionEvent) => void, onError: (m: string) => void, baseURL = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/train/`): () => void {
  const w = new Worker(`${baseURL}worker.mjs`, { type: "module" });
  w.onmessage = (e: MessageEvent<TrainFromWorker>) => {
    if (e.data.type === "failed") onError(e.data.message);
    else {
      onEvent(e.data);
      if (e.data.type === "done") w.terminate();
    }
  };
  w.onerror = (e) => onError(e.message || "Trainer worker failed to start");
  w.postMessage({ type: "run", req } satisfies TrainToWorker);
  return () => w.terminate();
}
