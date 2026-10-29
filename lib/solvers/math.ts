/** Numerically stable maths used to compute derive-it and metric cards. Pure, no DOM. */

export type Vec = readonly number[];

export function logSumExp(x: Vec): number {
  if (x.length === 0) return -Infinity;
  const m = Math.max(...x);
  if (!Number.isFinite(m)) return m;
  let s = 0;
  for (const v of x) s += Math.exp(v - m);
  return m + Math.log(s);
}

export function softmax(x: Vec): number[] {
  const l = logSumExp(x);
  return x.map((v) => Math.exp(v - l));
}

/** Cross-entropy of a one-hot target: logsumexp(z) - z[target]. */
export function softmaxCrossEntropy(logits: Vec, target: number): number {
  if (!Number.isInteger(target) || target < 0 || target >= logits.length) throw new RangeError("target out of range");
  return logSumExp(logits) - logits[target];
}

/** d(CE)/d(logits) = softmax(z) - onehot(target). */
export function softmaxCEGrad(logits: Vec, target: number): number[] {
  if (!Number.isInteger(target) || target < 0 || target >= logits.length) throw new RangeError("target out of range");
  return softmax(logits).map((p, i) => p - (i === target ? 1 : 0));
}

/** Stable sigmoid: never exponentiates a large positive number. */
export function sigmoid(x: number): number {
  if (x >= 0) return 1 / (1 + Math.exp(-x));
  const e = Math.exp(x);
  return e / (1 + e);
}

/** BCE with logits: max(z,0) - z*y + log(1+exp(-|z|)). */
export function bceWithLogits(z: number, y: number): number {
  return Math.max(z, 0) - z * y + Math.log1p(Math.exp(-Math.abs(z)));
}

export const bceWithLogitsGrad = (z: number, y: number): number => sigmoid(z) - y;

export function mse(pred: Vec, target: Vec): number {
  if (pred.length !== target.length || pred.length === 0) throw new RangeError("length mismatch");
  return pred.reduce((s, p, i) => s + (p - target[i]) ** 2, 0) / pred.length;
}

/** d(MSE)/d(pred_i) = 2 (pred_i - target_i) / n. */
export function mseGrad(pred: Vec, target: Vec): number[] {
  if (pred.length !== target.length || pred.length === 0) throw new RangeError("length mismatch");
  return pred.map((p, i) => (2 * (p - target[i])) / pred.length);
}

/** Central finite difference of f at x, used by tests to prove analytic gradients. */
export function numericGrad(f: (x: number[]) => number, x: Vec, h = 1e-6): number[] {
  return x.map((_, i) => {
    const hi = [...x];
    const lo = [...x];
    hi[i] += h;
    lo[i] -= h;
    return (f(hi) - f(lo)) / (2 * h);
  });
}
