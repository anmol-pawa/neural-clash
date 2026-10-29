/** Classification and ranking metrics for metric-drill cards. */

export interface Confusion {
  tp: number;
  fp: number;
  tn: number;
  fn: number;
}

const div = (a: number, b: number): number => (b === 0 ? 0 : a / b);

export function confusion(yTrue: readonly number[], yPred: readonly number[]): Confusion {
  if (yTrue.length !== yPred.length) throw new RangeError("length mismatch");
  const c: Confusion = { tp: 0, fp: 0, tn: 0, fn: 0 };
  yTrue.forEach((t, i) => {
    const p = yPred[i];
    if (t === 1 && p === 1) c.tp++;
    else if (t === 0 && p === 1) c.fp++;
    else if (t === 0 && p === 0) c.tn++;
    else c.fn++;
  });
  return c;
}

export const precision = (c: Confusion): number => div(c.tp, c.tp + c.fp);
export const recall = (c: Confusion): number => div(c.tp, c.tp + c.fn);
export const accuracy = (c: Confusion): number => div(c.tp + c.tn, c.tp + c.fp + c.tn + c.fn);
export function f1(c: Confusion): number {
  const p = precision(c);
  const r = recall(c);
  return div(2 * p * r, p + r);
}

/** ROC AUC as the probability a random positive outranks a random negative (ties count half). */
export function rocAuc(yTrue: readonly number[], score: readonly number[]): number {
  let wins = 0;
  let pairs = 0;
  for (let i = 0; i < yTrue.length; i++) {
    if (yTrue[i] !== 1) continue;
    for (let j = 0; j < yTrue.length; j++) {
      if (yTrue[j] !== 0) continue;
      pairs++;
      wins += score[i] > score[j] ? 1 : score[i] === score[j] ? 0.5 : 0;
    }
  }
  return div(wins, pairs);
}

/** nDCG@k with gain 2^rel - 1 and log2(rank+1) discount. `rels` is in the system's ranked order. */
export function ndcg(rels: readonly number[], k = rels.length): number {
  const dcg = (r: readonly number[]) => r.slice(0, k).reduce((s, v, i) => s + (2 ** v - 1) / Math.log2(i + 2), 0);
  const ideal = dcg([...rels].sort((a, b) => b - a));
  return div(dcg(rels), ideal);
}

/** Reciprocal rank of the first relevant (rel > 0) item; 0 if none. */
export function reciprocalRank(rels: readonly number[]): number {
  const i = rels.findIndex((r) => r > 0);
  return i < 0 ? 0 : 1 / (i + 1);
}

/** recall@k against the total number of relevant items in the corpus. */
export function recallAtK(rels: readonly number[], totalRelevant: number, k: number): number {
  return div(rels.slice(0, k).filter((r) => r > 0).length, totalRelevant);
}

/** Expected calibration error with equal-width bins over confidence for binary probabilities. */
export function ece(prob: readonly number[], yTrue: readonly number[], bins = 10): number {
  const sum = new Array<number>(bins).fill(0);
  const hit = new Array<number>(bins).fill(0);
  const cnt = new Array<number>(bins).fill(0);
  prob.forEach((p, i) => {
    const b = Math.min(bins - 1, Math.floor(p * bins));
    sum[b] += p;
    hit[b] += yTrue[i];
    cnt[b]++;
  });
  let e = 0;
  for (let b = 0; b < bins; b++) if (cnt[b]) e += (cnt[b] / prob.length) * Math.abs(hit[b] / cnt[b] - sum[b] / cnt[b]);
  return e;
}

/** Perplexity from a mean negative log-likelihood in nats. */
export const perplexity = (meanNll: number): number => Math.exp(meanNll);
