/** Small pure classical-ML solvers used to cross-check the Classic Grove deck (answers are computed by numpy; see tests/classical.test.ts). */

/** Gini impurity of a label list: 1 - sum of squared class proportions. */
export function gini(labels: readonly number[]): number {
  const counts = new Map<number, number>();
  for (const l of labels) counts.set(l, (counts.get(l) ?? 0) + 1);
  let s = 0;
  for (const c of counts.values()) s += (c / labels.length) ** 2;
  return 1 - s;
}

/** Shannon entropy in bits of a label list. */
export function labelEntropy(labels: readonly number[]): number {
  const counts = new Map<number, number>();
  for (const l of labels) counts.set(l, (counts.get(l) ?? 0) + 1);
  let h = 0;
  for (const c of counts.values()) { const p = c / labels.length; h -= p * Math.log2(p); }
  return h;
}

/** Size-weighted impurity of the children of a split. */
export function weightedImpurity(parts: readonly (readonly number[])[], impurity: (y: readonly number[]) => number): number {
  const n = parts.reduce((s, p) => s + p.length, 0);
  return parts.reduce((s, p) => s + (p.length / n) * impurity(p), 0);
}

/** Impurity decrease of a split (works with `gini` or `labelEntropy` for information gain). */
export function splitGain(parts: readonly (readonly number[])[], impurity: (y: readonly number[]) => number): number {
  return impurity(parts.flat()) - weightedImpurity(parts, impurity);
}

/** Best threshold for one numeric feature by weighted impurity: tries midpoints between sorted distinct values. */
export function bestThreshold(x: readonly number[], y: readonly number[], impurity: (y: readonly number[]) => number = gini): { threshold: number; score: number } {
  const xs = [...new Set(x)].sort((a, b) => a - b);
  let best = { threshold: NaN, score: Infinity };
  for (let i = 0; i + 1 < xs.length; i++) {
    const t = (xs[i] + xs[i + 1]) / 2;
    const left = y.filter((_, j) => x[j] <= t);
    const right = y.filter((_, j) => x[j] > t);
    const score = weightedImpurity([left, right], impurity);
    if (score < best.score) best = { threshold: t, score };
  }
  return best;
}

/** One-feature ridge weight without intercept: (x . y) / (x . x + lambda). */
export function ridge1d(x: readonly number[], y: readonly number[], lambda: number): number {
  const xy = x.reduce((s, v, i) => s + v * y[i], 0);
  const xx = x.reduce((s, v) => s + v * v, 0);
  return xy / (xx + lambda);
}

/** Simple least squares y = a x + b. Returns slope, intercept and R^2. */
export function simpleOls(x: readonly number[], y: readonly number[]): { slope: number; intercept: number; r2: number } {
  const n = x.length;
  const mx = x.reduce((s, v) => s + v, 0) / n;
  const my = y.reduce((s, v) => s + v, 0) / n;
  const sxy = x.reduce((s, v, i) => s + (v - mx) * (y[i] - my), 0);
  const sxx = x.reduce((s, v) => s + (v - mx) ** 2, 0);
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const ssRes = x.reduce((s, v, i) => s + (y[i] - (slope * v + intercept)) ** 2, 0);
  const ssTot = y.reduce((s, v) => s + (v - my) ** 2, 0);
  return { slope, intercept, r2: 1 - ssRes / ssTot };
}

const sigmoid = (z: number): number => 1 / (1 + Math.exp(-z));

/** Gradient of the mean binary cross-entropy for logistic regression: X^T (p - y) / n. */
export function logisticGradient(X: readonly (readonly number[])[], y: readonly number[], w: readonly number[]): number[] {
  const g = w.map(() => 0);
  X.forEach((row, i) => {
    const err = sigmoid(row.reduce((s, v, j) => s + v * w[j], 0)) - y[i];
    row.forEach((v, j) => { g[j] += (v * err) / X.length; });
  });
  return g;
}

/** Expected squared error from repeated refits at one point: bias squared, variance, and their sum plus noise. */
export function biasVariance(preds: readonly number[], truth: number, noiseVar: number): { bias2: number; variance: number; expectedMse: number } {
  const m = preds.reduce((s, v) => s + v, 0) / preds.length;
  const variance = preds.reduce((s, v) => s + (v - m) ** 2, 0) / preds.length;
  const bias2 = (m - truth) ** 2;
  return { bias2, variance, expectedMse: bias2 + variance + noiseVar };
}

/** Variance of the mean of B equally correlated predictors with common variance sigma2. */
export const ensembleVariance = (rho: number, sigma2: number, B: number): number => rho * sigma2 + ((1 - rho) * sigma2) / B;

/** Balanced class weights n / (k * count). */
export const balancedWeights = (counts: readonly number[]): number[] => {
  const n = counts.reduce((s, c) => s + c, 0);
  return counts.map((c) => n / (counts.length * c));
};

/** k-means inertia of a grouping of points. */
export function inertia(points: readonly (readonly number[])[], groups: readonly (readonly number[])[]): number {
  let total = 0;
  for (const g of groups) {
    const dim = points[0].length;
    const centre = Array.from({ length: dim }, (_, d) => g.reduce((s, i) => s + points[i][d], 0) / g.length);
    for (const i of g) total += points[i].reduce((s, v, d) => s + (v - centre[d]) ** 2, 0);
  }
  return total;
}

/** Signed geometric distance from x to the hyperplane w.x + b = 0. */
export const hyperplaneDistance = (w: readonly number[], b: number, x: readonly number[]): number =>
  (w.reduce((s, v, i) => s + v * x[i], b)) / Math.hypot(...w);

/** Naive Bayes posterior of the first class from priors and per-feature likelihoods. */
export function naiveBayesPosterior(prior: number, likA: readonly number[], likB: readonly number[]): number {
  const a = prior * likA.reduce((s, v) => s * v, 1);
  const b = (1 - prior) * likB.reduce((s, v) => s * v, 1);
  return a / (a + b);
}
