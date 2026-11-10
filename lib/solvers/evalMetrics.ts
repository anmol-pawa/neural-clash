// Pure helpers for Metric Market (CUR F6). Cross-check the numpy-computed deck answers (tests/metrics.test.ts).

export function precision(tp: number, fp: number): number { return tp / (tp + fp); }
export function recall(tp: number, fn: number): number { return tp / (tp + fn); }
export function fBeta(p: number, r: number, beta = 1): number { const b2 = beta * beta; return ((1 + b2) * p * r) / (b2 * p + r); }

/** P(condition | positive test) by Bayes' rule. */
export function ppv(sens: number, spec: number, prev: number): number { return (sens * prev) / (sens * prev + (1 - spec) * (1 - prev)); }
/** P(no condition | negative test). */
export function npv(sens: number, spec: number, prev: number): number { return (spec * (1 - prev)) / (spec * (1 - prev) + (1 - sens) * prev); }

/** ROC-AUC as the probability a random positive outscores a random negative (ties count half). */
export function rocAuc(scores: number[], labels: number[]): number {
  const pos = scores.filter((_, i) => labels[i] === 1), neg = scores.filter((_, i) => labels[i] === 0);
  let wins = 0;
  for (const p of pos) for (const n of neg) wins += p > n ? 1 : p === n ? 0.5 : 0;
  return wins / (pos.length * neg.length);
}

/** Average precision: mean of precision at the rank of each positive (descending score order). */
export function averagePrecision(scores: number[], labels: number[]): number {
  const order = scores.map((_, i) => i).sort((a, b) => scores[b] - scores[a]);
  let hits = 0, sum = 0;
  order.forEach((idx, rank) => { if (labels[idx] === 1) { hits++; sum += hits / (rank + 1); } });
  return sum / hits;
}

export function precisionAtK(rel: number[], k: number): number { return rel.slice(0, k).reduce((a, b) => a + b, 0) / k; }
export function meanReciprocalRank(ranks: number[]): number { return ranks.reduce((a, r) => a + 1 / r, 0) / ranks.length; }
export function ndcg(rel: number[]): number {
  const dcg = (xs: number[]) => xs.reduce((a, g, i) => a + (2 ** g - 1) / Math.log2(i + 2), 0);
  return dcg(rel) / dcg([...rel].sort((a, b) => b - a));
}
export function rSquared(y: number[], pred: number[]): number {
  const m = y.reduce((a, b) => a + b, 0) / y.length;
  const sse = y.reduce((a, v, i) => a + (v - pred[i]) ** 2, 0), sst = y.reduce((a, v) => a + (v - m) ** 2, 0);
  return 1 - sse / sst;
}
export function standardErrorProportion(p: number, n: number): number { return Math.sqrt((p * (1 - p)) / n); }
