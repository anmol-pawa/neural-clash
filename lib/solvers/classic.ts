// Pure helpers for Classic Grove (CUR F5). Cross-check the numpy-computed deck answers (tests/classic.test.ts).

/** Gini impurity of a node from class counts: 1 - sum(p^2). */
export function gini(counts: number[]): number {
  const n = counts.reduce((a, b) => a + b, 0);
  if (n === 0) return 0;
  return 1 - counts.reduce((a, c) => a + (c / n) ** 2, 0);
}

/** Shannon entropy in bits of a node from class counts. */
export function entropyBits(counts: number[]): number {
  const n = counts.reduce((a, b) => a + b, 0);
  if (n === 0) return 0;
  return counts.reduce((a, c) => (c > 0 ? a - (c / n) * Math.log2(c / n) : a), 0);
}

/** Impurity reduction of splitting `parent` into `children` (size-weighted). */
export function impurityGain(impurity: (counts: number[]) => number, parent: number[], children: number[][]): number {
  const n = parent.reduce((a, b) => a + b, 0);
  const weighted = children.reduce((a, ch) => a + (ch.reduce((x, y) => x + y, 0) / n) * impurity(ch), 0);
  return impurity(parent) - weighted;
}

/** Best threshold on one feature by size-weighted Gini of the two sides (ties: first/lowest threshold). */
export function bestThreshold(x: number[], y: number[], classes = 2): { threshold: number; score: number } {
  const xs = [...new Set(x)].sort((a, b) => a - b);
  let best = { threshold: NaN, score: Infinity };
  for (const t of xs.slice(0, -1)) {
    const left = new Array(classes).fill(0), right = new Array(classes).fill(0);
    x.forEach((v, i) => (v <= t ? left : right)[y[i]]++);
    const score = (left.reduce((a, b) => a + b, 0) * gini(left) + right.reduce((a, b) => a + b, 0) * gini(right)) / x.length;
    if (score < best.score - 1e-12) best = { threshold: t, score };
  }
  return best;
}

/** Simple linear regression y = a + b x by least squares, with the sum of squared residuals. */
export function olsLine(x: number[], y: number[]): { a: number; b: number; sse: number } {
  const n = x.length, mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n;
  const sxy = x.reduce((a, v, i) => a + (v - mx) * (y[i] - my), 0), sxx = x.reduce((a, v) => a + (v - mx) ** 2, 0);
  const b = sxy / sxx, a = my - b * mx;
  return { a, b, sse: x.reduce((s, v, i) => s + (y[i] - a - b * v) ** 2, 0) };
}

/** No-intercept ridge slope for one feature: x.y / (x.x + lambda). */
export function ridgeSlope(x: number[], y: number[], lambda: number): number {
  const xy = x.reduce((a, v, i) => a + v * y[i], 0), xx = x.reduce((a, v) => a + v * v, 0);
  return xy / (xx + lambda);
}

const sigmoid = (z: number): number => 1 / (1 + Math.exp(-z));

/** Logit, probability and log-loss of one logistic prediction. */
export function logisticPoint(w: number[], b: number, x: number[], y: 0 | 1): { logit: number; p: number; loss: number } {
  const logit = w.reduce((a, v, i) => a + v * x[i], b);
  const p = sigmoid(logit);
  return { logit, p, loss: -Math.log(y === 1 ? p : 1 - p) };
}

/** Centroids (means) and inertia of 1D clusters. */
export function kmeans1d(clusters: number[][]): { centroids: number[]; inertia: number } {
  const centroids = clusters.map((c) => c.reduce((a, b) => a + b, 0) / c.length);
  const inertia = clusters.reduce((s, c, k) => s + c.reduce((a, v) => a + (v - centroids[k]) ** 2, 0), 0);
  return { centroids, inertia };
}

/** Variance of the mean of n models with equal variance s2 and pairwise correlation rho. */
export const ensembleVariance = (s2: number, n: number, rho: number): number => rho * s2 + ((1 - rho) * s2) / n;

/** Balanced class weight n / (k * n_class). */
export const balancedWeight = (n: number, k: number, nClass: number): number => n / (k * nClass);

/** SVM margin width 2 / ||w||. */
export const svmMargin = (w: number[]): number => 2 / Math.hypot(...w);

/** Posterior of class 1 under a two-class Naive Bayes given priors and per-feature likelihoods of the observed values. */
export function naiveBayesPosterior(prior1: number, like1: number[], like0: number[]): number {
  const a = like1.reduce((p, v) => p * v, prior1), b = like0.reduce((p, v) => p * v, 1 - prior1);
  return a / (a + b);
}
