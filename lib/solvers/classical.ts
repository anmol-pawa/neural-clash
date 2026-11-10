/** Independent TypeScript solvers for the Classic Grove deck (CUR F5). Tests cross-check the numpy-computed card answers against these. */

const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;

/** Gini impurity of 0/1 labels. */
export function gini(y: number[]): number {
  if (y.length === 0) return 0;
  const p = mean(y);
  return 1 - p * p - (1 - p) * (1 - p);
}

/** Shannon entropy in bits of 0/1 labels. */
export function binaryEntropy(y: number[]): number {
  if (y.length === 0) return 0;
  const p = mean(y);
  return p === 0 || p === 1 ? 0 : -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
}

/** Size-weighted impurity of a split. */
export function weightedImpurity(left: number[], right: number[], impurity: (y: number[]) => number = gini): number {
  const n = left.length + right.length;
  return (left.length * impurity(left) + right.length * impurity(right)) / n;
}

export function impurityDecrease(left: number[], right: number[], impurity: (y: number[]) => number = gini): number {
  return impurity([...left, ...right]) - weightedImpurity(left, right, impurity);
}

/** Exhaustive best threshold on one feature (midpoints between sorted distinct values). Ties go to the lower threshold. */
export function bestSplit(x: number[], y: number[], impurity: (y: number[]) => number = gini): { threshold: number; impurity: number } {
  const xs = [...new Set(x)].sort((a, b) => a - b);
  let best = { threshold: NaN, impurity: Infinity };
  for (let i = 0; i + 1 < xs.length; i++) {
    const t = (xs[i] + xs[i + 1]) / 2;
    const imp = weightedImpurity(y.filter((_, j) => x[j] <= t), y.filter((_, j) => x[j] > t), impurity);
    if (imp < best.impurity - 1e-12) best = { threshold: t, impurity: imp };
  }
  return best;
}

/** One-feature ridge without intercept: w = x.y / (x.x + lambda). */
export function ridge1d(x: number[], y: number[], lambda: number): number {
  return x.reduce((s, v, i) => s + v * y[i], 0) / (x.reduce((s, v) => s + v * v, 0) + lambda);
}

/** Closed-form simple linear regression y = b + m x with R^2. */
export function simpleOls(x: number[], y: number[]): { intercept: number; slope: number; r2: number } {
  const mx = mean(x), my = mean(y);
  const slope = x.reduce((s, v, i) => s + (v - mx) * (y[i] - my), 0) / x.reduce((s, v) => s + (v - mx) ** 2, 0);
  const intercept = my - slope * mx;
  const rss = y.reduce((s, v, i) => s + (v - intercept - slope * x[i]) ** 2, 0);
  const tss = y.reduce((s, v) => s + (v - my) ** 2, 0);
  return { intercept, slope, r2: 1 - rss / tss };
}

/** Proximal step of the L1 penalty. */
export function softThreshold(w: number[], lambda: number): number[] {
  return w.map((v) => Math.sign(v) * Math.max(Math.abs(v) - lambda, 0) + 0);
}

export const logit = (p: number) => Math.log(p / (1 - p));

/** Labels of the k nearest 1-D training points to q (ties resolved by index), and their majority label. */
export function knn1d(xs: number[], ys: number[], q: number, k: number): { labels: number[]; vote: number } {
  const idx = xs.map((_, i) => i).sort((a, b) => Math.abs(xs[a] - q) - Math.abs(xs[b] - q) || a - b).slice(0, k);
  const labels = idx.map((i) => ys[i]);
  const counts = new Map<number, number>();
  for (const l of labels) counts.set(l, (counts.get(l) ?? 0) + 1);
  const vote = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
  return { labels, vote };
}

/** One 1-D k-means iteration: nearest-centre assignment (ties to the lower index), then centre means. */
export function kmeansStep1d(xs: number[], centres: number[]): { assign: number[]; centres: number[]; inertia: number } {
  const assign = xs.map((v) => centres.reduce((bi, c, i) => (Math.abs(v - c) < Math.abs(v - centres[bi]) ? i : bi), 0));
  const next = centres.map((c, k) => { const m = xs.filter((_, i) => assign[i] === k); return m.length ? mean(m) : c; });
  const inertia = xs.reduce((s, v, i) => s + (v - centres[assign[i]]) ** 2, 0);
  return { assign, centres: next, inertia };
}

export function totalSumSquares(xs: number[]): number {
  const m = mean(xs);
  return xs.reduce((s, v) => s + (v - m) ** 2, 0);
}

/** Balanced class weight n / (k * count). */
export const balancedWeight = (n: number, k: number, count: number) => n / (k * count);

/** Add-alpha smoothed likelihood of an item seen `count` times among `total` events over a vocabulary of `vocab`. */
export const smoothedLikelihood = (count: number, total: number, vocab: number, alpha = 1) => (count + alpha) / (total + alpha * vocab);

/** Naive Bayes posterior of the positive class given per-feature likelihoods under each class. */
export function naiveBayesPosterior(prior: number, likePos: number[], likeNeg: number[]): number {
  const pos = prior * likePos.reduce((p, v) => p * v, 1);
  const neg = (1 - prior) * likeNeg.reduce((p, v) => p * v, 1);
  return pos / (pos + neg);
}

/** Sizes of numpy.array_split. */
export function arraySplitSizes(n: number, k: number): number[] {
  return Array.from({ length: k }, (_, i) => Math.floor(n / k) + (i < n % k ? 1 : 0));
}
