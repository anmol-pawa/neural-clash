export interface Confusion {
  tp: number;
  fp: number;
  fn: number;
  tn: number;
}

/** Confusion counts from parallel label/prediction arrays (positive class = 1). */
export function confusion(truth: readonly (0 | 1)[], pred: readonly (0 | 1)[]): Confusion {
  if (truth.length !== pred.length) throw new Error("length mismatch");
  const c: Confusion = { tp: 0, fp: 0, fn: 0, tn: 0 };
  truth.forEach((t, i) => {
    if (t === 1) pred[i] === 1 ? c.tp++ : c.fn++;
    else pred[i] === 1 ? c.fp++ : c.tn++;
  });
  return c;
}

const div = (a: number, b: number): number => (b === 0 ? 0 : a / b);

export const precision = (c: Confusion): number => div(c.tp, c.tp + c.fp);
export const recall = (c: Confusion): number => div(c.tp, c.tp + c.fn);
export const accuracy = (c: Confusion): number => div(c.tp + c.tn, c.tp + c.fp + c.fn + c.tn);
export function f1(c: Confusion): number {
  const p = precision(c);
  const r = recall(c);
  return div(2 * p * r, p + r);
}

/** ROC-AUC as the probability a random positive outranks a random negative (ties count half). */
export function rocAuc(truth: readonly (0 | 1)[], score: readonly number[]): number {
  let wins = 0;
  let pairs = 0;
  for (let i = 0; i < truth.length; i++) {
    if (truth[i] !== 1) continue;
    for (let j = 0; j < truth.length; j++) {
      if (truth[j] !== 0) continue;
      pairs++;
      if (score[i] > score[j]) wins += 1;
      else if (score[i] === score[j]) wins += 0.5;
    }
  }
  return div(wins, pairs);
}

/** DCG@k with the 2^rel - 1 gain. */
export function dcg(rels: readonly number[], k = rels.length): number {
  return rels.slice(0, k).reduce((a, r, i) => a + (2 ** r - 1) / Math.log2(i + 2), 0);
}
export function ndcg(rels: readonly number[], k = rels.length): number {
  const ideal = dcg([...rels].sort((a, b) => b - a), k);
  return div(dcg(rels, k), ideal);
}

/** recall@k over a ranked list of relevance flags with `totalRelevant` relevant docs overall. */
export function recallAtK(ranked: readonly boolean[], totalRelevant: number, k: number): number {
  return div(ranked.slice(0, k).filter(Boolean).length, totalRelevant);
}

/** Mean reciprocal rank: 1/rank of the first relevant hit per query. */
export function mrr(queries: readonly (readonly boolean[])[]): number {
  const rr = queries.map((q) => {
    const i = q.indexOf(true);
    return i < 0 ? 0 : 1 / (i + 1);
  });
  return div(rr.reduce((a, b) => a + b, 0), rr.length);
}
