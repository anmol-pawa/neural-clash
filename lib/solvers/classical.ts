/** Small pure classical-ML solvers used to cross-check the Classic Grove deck (answers are computed by numpy; see tests/classical.test.ts). */

import { sigmoid } from "./math";

type Matrix = readonly (readonly number[])[];

const dot = (a: readonly number[], b: readonly number[]): number => a.reduce((s, v, i) => s + v * b[i], 0);

/** Solve A x = b by Gaussian elimination with partial pivoting (small dense systems). */
export function solveLinear(A: Matrix, b: readonly number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) throw new Error("singular matrix");
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) x[r] = (M[r][n] - dot(M[r].slice(r + 1, n), x.slice(r + 1))) / M[r][r];
  return x;
}

/** Ridge regression (lambda = 0 is ordinary least squares) via (X^T X + lambda I) w = X^T y. Pass a ones column for an intercept. */
export function ridgeFit(X: Matrix, y: readonly number[], lambda = 0): number[] {
  const d = X[0].length;
  const A = Array.from({ length: d }, (_, i) => Array.from({ length: d }, (_, j) => X.reduce((s, row) => s + row[i] * row[j], 0) + (i === j ? lambda : 0)));
  const b = Array.from({ length: d }, (_, i) => X.reduce((s, row, k) => s + row[i] * y[k], 0));
  return solveLinear(A, b);
}

/** Coefficient of determination: 1 - SS_res / SS_tot. */
export function r2Score(y: readonly number[], pred: readonly number[]): number {
  const m = y.reduce((s, v) => s + v, 0) / y.length;
  const res = y.reduce((s, v, i) => s + (v - pred[i]) ** 2, 0);
  const tot = y.reduce((s, v) => s + (v - m) ** 2, 0);
  return 1 - res / tot;
}

/** Mean binary log-loss and its gradient with respect to the weights, for logistic regression. */
export function logisticLossGrad(X: Matrix, y: readonly number[], w: readonly number[]): { loss: number; grad: number[] } {
  const p = X.map((row) => sigmoid(dot(row, w)));
  const loss = -y.reduce((s, yi, i) => s + yi * Math.log(p[i]) + (1 - yi) * Math.log(1 - p[i]), 0) / y.length;
  const grad = w.map((_, j) => X.reduce((s, row, i) => s + row[j] * (p[i] - y[i]), 0) / y.length);
  return { loss, grad };
}

/** Gini impurity of a label list. */
export function gini(labels: readonly number[]): number {
  if (labels.length === 0) return 0;
  const counts = new Map<number, number>();
  for (const l of labels) counts.set(l, (counts.get(l) ?? 0) + 1);
  let s = 0;
  for (const c of counts.values()) s += (c / labels.length) ** 2;
  return 1 - s;
}

/** Shannon entropy (bits) of a label list. */
export function labelEntropy(labels: readonly number[]): number {
  const counts = new Map<number, number>();
  for (const l of labels) counts.set(l, (counts.get(l) ?? 0) + 1);
  let h = 0;
  for (const c of counts.values()) h -= (c / labels.length) * Math.log2(c / labels.length);
  return h;
}

/** Size-weighted impurity of a split and the gain over the parent. */
export function splitGain(parent: readonly number[], left: readonly number[], right: readonly number[], impurity = gini): { child: number; gain: number } {
  const child = (left.length * impurity(left) + right.length * impurity(right)) / (left.length + right.length);
  return { child, gain: impurity(parent) - child };
}

/** Best threshold on one feature by impurity decrease (midpoints between sorted distinct values). */
export function bestSplit(x: readonly number[], y: readonly number[]): { threshold: number; gain: number } {
  const xs = [...new Set(x)].sort((a, b) => a - b);
  let best = { threshold: NaN, gain: -Infinity };
  for (let i = 0; i + 1 < xs.length; i++) {
    const t = (xs[i] + xs[i + 1]) / 2;
    const g = splitGain(y, y.filter((_, k) => x[k] < t), y.filter((_, k) => x[k] >= t)).gain;
    if (g > best.gain) best = { threshold: t, gain: g };
  }
  return best;
}

/** One Lloyd iteration for k-means: assign to the nearest centroid, then move centroids to the cluster means. */
export function kmeansStep(points: Matrix, centroids: Matrix): { labels: number[]; inertia: number; centroids: number[][] } {
  const sq = (a: readonly number[], b: readonly number[]) => a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0);
  const labels = points.map((p) => centroids.reduce((best, c, k) => (sq(p, c) < sq(p, centroids[best]) ? k : best), 0));
  const inertia = points.reduce((s, p, i) => s + sq(p, centroids[labels[i]]), 0);
  const next = centroids.map((c, k) => {
    const members = points.filter((_, i) => labels[i] === k);
    return members.length === 0 ? [...c] : c.map((_, d) => members.reduce((s, p) => s + p[d], 0) / members.length);
  });
  return { labels, inertia, centroids: next };
}

/** Indices of the k nearest rows to a query by Euclidean distance (ties broken by index). */
export function knnIndices(points: Matrix, q: readonly number[], k: number): number[] {
  const d = points.map((p, i) => ({ i, d: Math.sqrt(p.reduce((s, v, j) => s + (v - q[j]) ** 2, 0)) }));
  return d.sort((a, b) => a.d - b.d || a.i - b.i).slice(0, k).map((e) => e.i);
}

/** Precision, recall and F1 from confusion counts. */
export function prf1(tp: number, fp: number, fn: number): { precision: number; recall: number; f1: number } {
  const precision = tp / (tp + fp);
  const recall = tp / (tp + fn);
  return { precision, recall, f1: (2 * precision * recall) / (precision + recall) };
}

/** 'Balanced' class weights n / (k * count). */
export const balancedWeights = (counts: readonly number[]): number[] => {
  const n = counts.reduce((s, c) => s + c, 0);
  return counts.map((c) => n / (counts.length * c));
};

/** Variance of the average of m equally correlated models with variance s2 and pairwise correlation rho. */
export const averagedVariance = (rho: number, s2: number, m: number): number => rho * s2 + ((1 - rho) * s2) / m;

/** Naive Bayes posterior over classes for binary features; p[c][j] = P(feature j = 1 | class c). */
export function naiveBayesPosterior(prior: readonly number[], p: Matrix, x: readonly number[]): number[] {
  const score = prior.map((pr, c) => pr * x.reduce((s, xj, j) => s * (xj ? p[c][j] : 1 - p[c][j]), 1));
  const z = score.reduce((s, v) => s + v, 0);
  return score.map((v) => v / z);
}
