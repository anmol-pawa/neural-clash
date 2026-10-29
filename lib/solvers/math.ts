/** Numerically stable softmax: subtracts the max logit so large inputs cannot overflow. */
export function softmax(logits: readonly number[]): number[] {
  if (logits.length === 0) throw new Error("softmax of empty vector");
  const m = Math.max(...logits);
  const exps = logits.map((z) => Math.exp(z - m));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

/** log-sum-exp, stable. */
export function logSumExp(xs: readonly number[]): number {
  const m = Math.max(...xs);
  return m + Math.log(xs.reduce((a, x) => a + Math.exp(x - m), 0));
}

/** Cross-entropy of softmax(logits) against the true class index: logsumexp(z) - z[y]. */
export function softmaxCrossEntropy(logits: readonly number[], target: number): number {
  if (!Number.isInteger(target) || target < 0 || target >= logits.length) throw new Error("target out of range");
  return logSumExp(logits) - logits[target];
}

/** Gradient of softmax-CE w.r.t. the logits: softmax(z) - onehot(y). */
export function softmaxCrossEntropyGrad(logits: readonly number[], target: number): number[] {
  const p = softmax(logits);
  if (!Number.isInteger(target) || target < 0 || target >= p.length) throw new Error("target out of range");
  return p.map((v, i) => (i === target ? v - 1 : v));
}

export function sigmoid(x: number): number {
  return x >= 0 ? 1 / (1 + Math.exp(-x)) : Math.exp(x) / (1 + Math.exp(x));
}

/** Binary cross-entropy from a logit, stable: max(z,0) - z*y + log(1+exp(-|z|)). */
export function bceWithLogits(z: number, y: 0 | 1): number {
  return Math.max(z, 0) - z * y + Math.log1p(Math.exp(-Math.abs(z)));
}

/** Gradient of BCE-with-logits w.r.t. the logit: sigmoid(z) - y. */
export function bceWithLogitsGrad(z: number, y: 0 | 1): number {
  return sigmoid(z) - y;
}

/** Mean squared error and its gradient w.r.t. predictions. */
export function mse(pred: readonly number[], target: readonly number[]): number {
  if (pred.length !== target.length || pred.length === 0) throw new Error("length mismatch");
  return pred.reduce((a, p, i) => a + (p - target[i]) ** 2, 0) / pred.length;
}
export function mseGrad(pred: readonly number[], target: readonly number[]): number[] {
  if (pred.length !== target.length || pred.length === 0) throw new Error("length mismatch");
  return pred.map((p, i) => (2 * (p - target[i])) / pred.length);
}

/** One SGD step on a scalar: w - lr * grad. */
export function sgdStep(w: number, grad: number, lr: number): number {
  return w - lr * grad;
}
