/**
 * One Training Grounds run as a pure, worker-friendly function (ARCH §5).
 * The worker, the tests and any future in-page fallback all call `runSession`, so what the
 * player sees is exactly what is tested. No DOM, no Worker globals.
 */
import { makeSplit, type Dataset, type ToyKind } from "./datasets";
import { companionMetrics, evaluate, predict, train, type EpochPoint, type Metrics, type Trained, type TrainConfig } from "./linear";

export interface SessionRequest {
  kind: ToyKind;
  nTrain: number;
  nTest: number;
  noise: number;
  seed: number;
  cfg: TrainConfig;
  /** Boundary frames per run (the heat-map is recomputed at most this many times). */
  frames?: number;
}

/** View window of the decision-boundary canvas: x1, x2 in [-B, B]. */
export const BOUND = 2.5;
export const GRID = 36;

export type SessionEvent =
  | { type: "epoch"; point: EpochPoint; grid: number[]; epochs: number }
  | { type: "done"; grid: number[]; points: { X: number[][]; y: number[] }; trainMetrics: Metrics; sealed: SealedResult };

/** What the hidden test set says. The UI keeps it behind the reveal button until the player commits. */
export interface SealedResult {
  test: Metrics;
  gap: number;
  params: number;
  r2: number;
}

/** Row-major GRID×GRID model outputs over [-BOUND, BOUND]² (row 0 = top = x2 max). */
export function boundaryGrid(model: Pick<Trained, "config" | "w" | "params">, res = GRID, bound = BOUND): number[] {
  const pts: number[][] = [];
  for (let r = 0; r < res; r++) for (let c = 0; c < res; c++) pts.push([((c + 0.5) / res) * 2 * bound - bound, bound - ((r + 0.5) / res) * 2 * bound]);
  return predict(model as Trained, pts);
}

export function splitFor(req: SessionRequest): { train: Dataset; val: Dataset; test: Dataset } {
  const s = makeSplit(req.kind, req.nTrain, req.nTest, req.noise, req.seed);
  // The validation set is a third independent stream: the player may watch it, the hidden test set stays sealed.
  const val = makeSplit(req.kind, req.nTrain, req.nTest, req.noise, (req.seed ^ 0x51ed270b) >>> 0).test;
  return { train: s.train, val, test: s.test };
}

export function runSession(req: SessionRequest, emit: (e: SessionEvent) => void): void {
  const { train: tr, val, test } = splitFor(req);
  const frames = Math.max(1, req.frames ?? 60);
  const stride = Math.max(1, Math.floor(req.cfg.epochs / frames));
  const t = train(tr, req.cfg, val, (point, w) => {
    if (point.epoch % stride !== 0 && point.epoch !== req.cfg.epochs - 1) return;
    const cfg = { model: req.cfg.model, lr: req.cfg.lr, epochs: req.cfg.epochs, batchSize: req.cfg.batchSize ?? 0, l2: req.cfg.l2 ?? 0, degree: req.cfg.degree ?? 1, seed: req.cfg.seed ?? 0 };
    emit({ type: "epoch", point, epochs: req.cfg.epochs, grid: boundaryGrid({ config: cfg, w: [...w], params: w.length }) });
  });
  const cm = companionMetrics(t, tr, test);
  emit({
    type: "done",
    grid: boundaryGrid(t),
    points: { X: tr.X, y: tr.y },
    trainMetrics: evaluate(t, tr),
    sealed: { test: evaluate(t, test), gap: cm.generalisationGap, params: cm.params, r2: cm.r2 },
  });
}
