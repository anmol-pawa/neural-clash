/**
 * Linear and logistic models with analytic gradients, full-batch or mini-batch SGD.
 * Float64 so results match the numpy reference to ~1e-12 (see tests/train.test.ts).
 * The bias is column 0 of the design matrix (a leading 1). L2 never penalises the bias.
 */
import { rng, shuffle } from "../cards/rng";
import type { Dataset } from "./datasets";
import { polyFeatures } from "./datasets";

export type ModelKind = "linear" | "logistic";

export interface TrainConfig {
  model: ModelKind;
  lr: number;
  epochs: number;
  /** 0 or >= n means full batch. */
  batchSize?: number;
  l2?: number;
  /** Polynomial feature degree (1 = raw x1, x2). */
  degree?: number;
  seed?: number;
}

export interface EpochPoint {
  epoch: number;
  trainLoss: number;
  /** Present only when a monitor set is supplied (the *validation* set, never the hidden test). */
  valLoss?: number;
}

export interface Metrics {
  loss: number;
  /** classification accuracy, NaN for regression */
  accuracy: number;
  /** R² for regression, NaN for classification */
  r2: number;
}

export interface Trained {
  config: Required<Omit<TrainConfig, "batchSize">> & { batchSize: number };
  w: number[];
  history: EpochPoint[];
  params: number;
}

export function design(X: number[][], degree: number): number[][] {
  const F = degree > 1 ? polyFeatures(X, degree) : X;
  return F.map((row) => [1, ...row]);
}

export function sigmoid(z: number): number {
  return z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z));
}

const dot = (a: number[], b: number[]) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
};

/** Mean loss and gradient over rows of the design matrix A. Stable BCE via max(z,0) - z·y + log1p(e^-|z|). */
export function lossGrad(kind: ModelKind, w: number[], A: number[][], y: number[], l2 = 0): { loss: number; grad: number[] } {
  const n = A.length;
  const grad = new Array<number>(w.length).fill(0);
  let loss = 0;
  for (let i = 0; i < n; i++) {
    const z = dot(A[i], w);
    let err: number;
    if (kind === "linear") {
      err = z - y[i];
      loss += err * err;
      err *= 2;
    } else {
      loss += Math.max(z, 0) - z * y[i] + Math.log1p(Math.exp(-Math.abs(z)));
      err = sigmoid(z) - y[i];
    }
    for (let j = 0; j < w.length; j++) grad[j] += err * A[i][j];
  }
  loss /= n;
  for (let j = 0; j < w.length; j++) grad[j] /= n;
  if (l2 > 0) {
    for (let j = 1; j < w.length; j++) {
      loss += l2 * w[j] * w[j];
      grad[j] += 2 * l2 * w[j];
    }
  }
  return { loss, grad };
}

export function train(data: Dataset, cfg: TrainConfig, monitor?: Dataset): Trained {
  const config = {
    model: cfg.model,
    lr: cfg.lr,
    epochs: cfg.epochs,
    batchSize: cfg.batchSize ?? 0,
    l2: cfg.l2 ?? 0,
    degree: cfg.degree ?? 1,
    seed: cfg.seed ?? 0,
  };
  const A = design(data.X, config.degree);
  const M = monitor ? design(monitor.X, config.degree) : null;
  const n = A.length;
  const bs = config.batchSize > 0 && config.batchSize < n ? config.batchSize : n;
  const w = new Array<number>(A[0].length).fill(0);
  const r = rng(config.seed);
  const history: EpochPoint[] = [];
  for (let e = 0; e < config.epochs; e++) {
    // Loss recorded before the epoch's updates, like the Lab reference.
    const p: EpochPoint = { epoch: e, trainLoss: lossGrad(config.model, w, A, data.y, config.l2).loss };
    if (M && monitor) p.valLoss = lossGrad(config.model, w, M, monitor.y).loss;
    history.push(p);
    const order = bs === n ? null : shuffle(r, Array.from({ length: n }, (_, i) => i));
    for (let s = 0; s < n; s += bs) {
      const idx = order ? order.slice(s, s + bs) : null;
      const Ab = idx ? idx.map((i) => A[i]) : A;
      const yb = idx ? idx.map((i) => data.y[i]) : data.y;
      const { grad } = lossGrad(config.model, w, Ab, yb, config.l2);
      for (let j = 0; j < w.length; j++) w[j] -= config.lr * grad[j];
    }
  }
  return { config, w, history, params: w.length };
}

export function predict(t: Trained, X: number[][]): number[] {
  return design(X, t.config.degree).map((row) => {
    const z = dot(row, t.w);
    return t.config.model === "logistic" ? sigmoid(z) : z;
  });
}

/** Score on any set (the hidden test set in the battle). Plain loss: no L2 term. */
export function evaluate(t: Trained, data: Dataset): Metrics {
  const A = design(data.X, t.config.degree);
  const { loss } = lossGrad(t.config.model, t.w, A, data.y, 0);
  if (t.config.model === "logistic") {
    const p = predict(t, data.X);
    const ok = p.filter((v, i) => (v >= 0.5 ? 1 : 0) === data.y[i]).length;
    return { loss, accuracy: ok / data.y.length, r2: NaN };
  }
  const mean = data.y.reduce((a, b) => a + b, 0) / data.y.length;
  const ssTot = data.y.reduce((a, b) => a + (b - mean) ** 2, 0);
  const ssRes = loss * data.y.length;
  const r2 = ssTot === 0 ? (ssRes === 0 ? 1 : 0) : 1 - ssRes / ssTot;
  return { loss, accuracy: NaN, r2 };
}

/** Accuracy-or-R² as one 0..1 "score" for the battle. */
export function score(m: Metrics): number {
  const s = Number.isNaN(m.accuracy) ? m.r2 : m.accuracy;
  return Math.min(1, Math.max(0, s));
}

/** Bridge to the companion stats (GDD §5.3): measured metrics on the hidden set, never typed by hand. */
export function companionMetrics(t: Trained, train: Dataset, test: Dataset) {
  const te = evaluate(t, test);
  const tr = evaluate(t, train);
  return { r2: Number.isNaN(te.r2) ? te.accuracy : te.r2, generalisationGap: te.loss - tr.loss, params: t.params };
}
