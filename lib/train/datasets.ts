/** Seeded 2D toy datasets for the Training Grounds (ARCH §5). Pure; no DOM. */
import { rng } from "../cards/rng";

export type ToyKind = "blobs" | "xor" | "circles" | "moons" | "line";

export interface Dataset {
  kind: ToyKind;
  /** n rows of [x1, x2] */
  X: number[][];
  /** class labels 0/1 for classification, real targets for "line" */
  y: number[];
  task: "classification" | "regression";
}

export interface Split {
  train: Dataset;
  /** The hidden set: the battle reveals its score, the UI never plots it while training. */
  test: Dataset;
}

/** Box-Muller normal from a uniform source. */
function normal(r: () => number): number {
  const u = Math.max(r(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
}

export function makeToy(kind: ToyKind, n: number, noise: number, seed: number): Dataset {
  const r = rng(seed);
  const X: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < n; i++) {
    const c = i % 2;
    let x1 = 0;
    let x2 = 0;
    let t = 0;
    switch (kind) {
      case "blobs":
        x1 = (c ? 1 : -1) * 1.2 + noise * normal(r);
        x2 = (c ? 1 : -1) * 0.8 + noise * normal(r);
        break;
      case "xor": {
        const a = r() < 0.5 ? -1 : 1;
        const b = c ? -a : a;
        x1 = a + noise * normal(r);
        x2 = b + noise * normal(r);
        break;
      }
      case "circles": {
        const rad = c ? 0.9 : 0.4;
        const th = 2 * Math.PI * r();
        x1 = rad * Math.cos(th) + noise * normal(r);
        x2 = rad * Math.sin(th) + noise * normal(r);
        break;
      }
      case "moons": {
        const th = Math.PI * r();
        x1 = (c ? 1 - Math.cos(th) : Math.cos(th)) + noise * normal(r);
        x2 = (c ? 0.5 - Math.sin(th) : Math.sin(th)) + noise * normal(r);
        break;
      }
      case "line": {
        x1 = 2 * r() - 1;
        x2 = 2 * r() - 1;
        t = 1.5 * x1 - 0.7 * x2 + 0.3 + noise * normal(r);
        break;
      }
    }
    X.push([x1, x2]);
    y.push(kind === "line" ? t : c);
  }
  return { kind, X, y, task: kind === "line" ? "regression" : "classification" };
}

/** Seeded train/test split drawn from independent streams, so changing `nTrain` never changes the test set. */
export function makeSplit(kind: ToyKind, nTrain: number, nTest: number, noise: number, seed: number): Split {
  // Independent seeds: train and test never share points.
  return {
    train: makeToy(kind, nTrain, noise, seed),
    test: makeToy(kind, nTest, noise, seed ^ 0x9e3779b9),
  };
}

/** Polynomial features up to `degree` (no bias column): x1, x2, x1², x1·x2, x2², ... */
export function polyFeatures(X: number[][], degree: number): number[][] {
  return X.map(([a, b]) => {
    const f: number[] = [];
    for (let d = 1; d <= degree; d++) for (let i = d; i >= 0; i--) f.push(a ** i * b ** (d - i));
    return f;
  });
}
