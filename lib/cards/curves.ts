import { rng } from "./rng";

/** Diagnoses a loss-curve card can ask about. Order is the fixed choice order on the card. */
export const DIAGNOSES = ["Overfitting", "Underfitting", "Learning rate too high", "Healthy fit"] as const;
export type Diagnosis = (typeof DIAGNOSES)[number];

export interface LossCurves {
  train: number[];
  val: number[];
}

interface Scenario {
  degree: number;
  nTrain: number;
  lr: number;
  noise: number;
  /** Frequency of the sine the data is drawn from. */
  freq: number;
  epochs: number;
}

const SCENARIOS: Record<Diagnosis, Scenario> = {
  Overfitting: { degree: 9, nTrain: 9, lr: 0.3, noise: 0.45, freq: 2.5, epochs: 12000 },
  Underfitting: { degree: 1, nTrain: 60, lr: 0.3, noise: 0.1, freq: 4, epochs: 200 },
  "Learning rate too high": { degree: 3, nTrain: 60, lr: 1.9, noise: 0.1, freq: 2.5, epochs: 40 },
  "Healthy fit": { degree: 3, nTrain: 60, lr: 0.3, noise: 0.1, freq: 2.5, epochs: 200 },
};

const features = (x: number, degree: number): number[] => Array.from({ length: degree + 1 }, (_, k) => x ** k);

function mse(w: number[], X: number[][], y: number[]): number {
  let s = 0;
  for (let i = 0; i < X.length; i++) {
    const e = X[i].reduce((a, v, k) => a + v * w[k], 0) - y[i];
    s += e * e;
  }
  return s / X.length;
}

/**
 * Trains polynomial regression with full-batch gradient descent on a noisy sine and records
 * train/validation MSE per epoch. The curves are real runs, never typed shapes.
 */
export function trainCurves(kind: Diagnosis, seed: number): LossCurves {
  const sc = SCENARIOS[kind];
  const r = rng(seed);
  const gauss = () => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
  const f = (x: number) => Math.sin(sc.freq * x);
  const sample = (n: number) => {
    const xs = Array.from({ length: n }, () => r() * 2 - 1);
    return { X: xs.map((x) => features(x, sc.degree)), y: xs.map((x) => f(x) + sc.noise * gauss()) };
  };
  const tr = sample(sc.nTrain);
  const va = sample(200);
  const w = new Array(sc.degree + 1).fill(0);
  const out: LossCurves = { train: [], val: [] };
  for (let e = 0; e < sc.epochs; e++) {
    const g = new Array(w.length).fill(0);
    for (let i = 0; i < tr.X.length; i++) {
      const err = tr.X[i].reduce((a, v, k) => a + v * w[k], 0) - tr.y[i];
      for (let k = 0; k < w.length; k++) g[k] += (2 * err * tr.X[i][k]) / tr.X.length;
    }
    for (let k = 0; k < w.length; k++) w[k] -= sc.lr * g[k];
    out.train.push(mse(w, tr.X, tr.y));
    out.val.push(mse(w, va.X, va.y));
  }
  return out;
}

/**
 * Names what a pair of curves shows, from the numbers alone. The card generator asserts that this
 * agrees with the scenario that produced the curves, so a card can never mislabel its picture.
 */
export function classifyCurves(c: LossCurves): Diagnosis {
  const n = c.train.length;
  const finalTrain = c.train[n - 1];
  const finalVal = c.val[n - 1];
  const worst = Math.max(...c.train);
  if (!Number.isFinite(finalTrain) || finalTrain > 2 * c.train[0] || worst >= 5) return "Learning rate too high";
  const bestVal = Math.min(...c.val);
  if (finalVal > 1.5 * bestVal && finalVal - finalTrain > 0.05) return "Overfitting";
  if (finalTrain > 0.1) return "Underfitting";
  return "Healthy fit";
}
