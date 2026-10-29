import { type Card } from "./cards";
import { pick, randInt } from "./rng";
import { confusion, f1, precision, recall, ndcg } from "@/lib/solvers/metrics";
import { softmaxCrossEntropy, softmaxCrossEntropyGrad, bceWithLogitsGrad } from "@/lib/solvers/math";
import { broadcast, linear, matmul, reduce, reshape, shapeToString, convOut, type Shape } from "@/lib/solvers/shapes";

const round = (x: number, d = 3): number => Number(x.toFixed(d));
const fmt = (xs: readonly number[]): string => `[${xs.join(", ")}]`;

/** Derive-it: cross-entropy of a 3-class softmax, answer from the solver. */
export function genSoftmaxCE(rng: () => number, id: string): Card {
  const logits = [0, 1, 2].map(() => randInt(rng, -2, 3));
  const y = randInt(rng, 0, 2);
  const loss = softmaxCrossEntropy(logits, y);
  return {
    id, kind: "derive", topic: "loss.cross-entropy", answer: round(loss), tol: 0.01,
    prompt: `Logits z = ${fmt(logits)}, true class index ${y}. What is the softmax cross-entropy loss (natural log, 3 decimals)?`,
    explain: `loss = logsumexp(z) - z[y] = ${round(loss, 4)}. Subtracting the max logit first keeps exp() from overflowing.`,
  };
}

/** Derive-it: one component of the softmax-CE gradient, which is softmax(z) - onehot(y). */
export function genSoftmaxGrad(rng: () => number, id: string): Card {
  const logits = [0, 1, 2].map(() => randInt(rng, -2, 3));
  const y = randInt(rng, 0, 2);
  const j = randInt(rng, 0, 2);
  const g = softmaxCrossEntropyGrad(logits, y)[j];
  return {
    id, kind: "derive", topic: "backprop.softmax-ce", answer: round(g), tol: 0.01,
    prompt: `Logits z = ${fmt(logits)}, true class ${y}. What is dLoss/dz[${j}] for softmax cross-entropy (3 decimals)?`,
    explain: `The gradient is softmax(z) - onehot(y), so component ${j} is p[${j}]${j === y ? " - 1" : ""} = ${round(g, 4)}.`,
  };
}

export function genBceGrad(rng: () => number, id: string): Card {
  const z = randInt(rng, -3, 3);
  const y = (rng() < 0.5 ? 0 : 1) as 0 | 1;
  const g = bceWithLogitsGrad(z, y);
  return {
    id, kind: "derive", topic: "backprop.bce", answer: round(g), tol: 0.01,
    prompt: `A single logit z = ${z} with label y = ${y} goes through sigmoid + binary cross-entropy. What is dLoss/dz (3 decimals)?`,
    explain: `For BCE on a sigmoid output the gradient w.r.t. the logit is sigmoid(z) - y = ${round(g, 4)}.`,
  };
}

function shapeCard(id: string, prompt: string, r: ReturnType<typeof matmul>, explain: string, topic: string): Card {
  return { id, kind: "shape", topic, prompt, answer: r.ok ? r.shape : "error", explain: r.ok ? `${explain} Result: ${shapeToString(r.shape)}.` : `${explain} numpy raises: ${r.error}.` };
}

export function genBroadcast(rng: () => number, id: string): Card {
  const dims = [1, 3, 4, 5];
  const a: Shape = [pick(rng, dims), pick(rng, dims), pick(rng, dims)].slice(0, randInt(rng, 2, 3));
  const b: Shape = [pick(rng, dims), pick(rng, dims)].slice(0, randInt(rng, 1, 2));
  return shapeCard(id, `What is the shape of a + b for a of shape ${shapeToString(a)} and b of shape ${shapeToString(b)}? Type the shape, or "error".`, broadcast(a, b),
    "Broadcasting aligns shapes from the right; each pair of dims must match or one must be 1.", "numpy.broadcasting");
}

export function genMatmul(rng: () => number, id: string): Card {
  const n = randInt(rng, 2, 6);
  const k = randInt(rng, 2, 6);
  const m = randInt(rng, 2, 6);
  const wrong = rng() < 0.3;
  const a: Shape = rng() < 0.5 ? [n, k] : [randInt(rng, 2, 4), n, k];
  const b: Shape = [wrong ? k + 1 : k, m];
  return shapeCard(id, `What is the shape of a @ b for a ${shapeToString(a)} and b ${shapeToString(b)}? Type the shape, or "error".`, matmul(a, b),
    "matmul contracts the last dim of a with the second-to-last of b; leading dims are batch dims.", "numpy.matmul");
}

export function genLinear(rng: () => number, id: string): Card {
  const batch = randInt(rng, 2, 8);
  const seq = randInt(rng, 2, 6);
  const i = pick(rng, [4, 8, 16]);
  const o = pick(rng, [2, 3, 10]);
  const x: Shape = rng() < 0.5 ? [batch, i] : [batch, seq, i];
  const r = linear(x, i, o);
  return shapeCard(id, `x has shape ${shapeToString(x)} and goes through nn.Linear(${i}, ${o}). Output shape?`, r,
    "Linear acts on the last dimension only; all leading dimensions are preserved.", "nn.linear");
}

export function genReduce(rng: () => number, id: string): Card {
  const x: Shape = [randInt(rng, 2, 5), randInt(rng, 2, 5), randInt(rng, 2, 5)];
  const axis = pick(rng, [0, 1, 2, -1]);
  const keep = rng() < 0.5;
  const r = reduce(x, axis, keep);
  return shapeCard(id, `x.sum(axis=${axis}, keepdims=${keep ? "True" : "False"}) for x of shape ${shapeToString(x)}: result shape?`, r,
    "The reduced axis disappears, or becomes 1 with keepdims=True.", "numpy.reduce");
}

export function genReshape(rng: () => number, id: string): Card {
  const x: Shape = [randInt(rng, 2, 4), randInt(rng, 2, 4), randInt(rng, 2, 4)];
  const total = x[0] * x[1] * x[2];
  const t: Shape = rng() < 0.5 ? [-1, x[2]] : [x[0], -1, pick(rng, [2, 3, 5])];
  return shapeCard(id, `x.reshape${shapeToString(t)} for x of shape ${shapeToString(x)} (${total} elements): result shape?`, reshape(x, t),
    "reshape needs the element count to match; a single -1 is inferred.", "numpy.reshape");
}

export function genConv(rng: () => number, id: string): Card {
  const n = pick(rng, [8, 16, 28, 32]);
  const k = pick(rng, [3, 5]);
  const s = pick(rng, [1, 2]);
  const p = pick(rng, [0, 1, 2]);
  const out = convOut(n, k, s, p);
  return {
    id, kind: "derive", topic: "cnn.output-size", answer: out, tol: 0,
    prompt: `A ${n}x${n} input through Conv2d with kernel ${k}, stride ${s}, padding ${p}. What is the output height?`,
    explain: `floor((n + 2p - k) / s) + 1 = floor((${n} + ${2 * p} - ${k}) / ${s}) + 1 = ${out}.`,
  };
}

/** Metric drill: a random confusion matrix drawn as a table; ask for precision, recall or F1. */
export function genMetric(rng: () => number, id: string): Card {
  const tp = randInt(rng, 5, 40);
  const fp = randInt(rng, 1, 30);
  const fn = randInt(rng, 1, 30);
  const tn = randInt(rng, 5, 60);
  const c = confusion(
    [...Array(tp + fn).fill(1), ...Array(fp + tn).fill(0)],
    [...Array(tp).fill(1), ...Array(fn).fill(0), ...Array(fp).fill(1), ...Array(tn).fill(0)],
  );
  const which = pick(rng, ["precision", "recall", "F1"] as const);
  const val = which === "precision" ? precision(c) : which === "recall" ? recall(c) : f1(c);
  return {
    id, kind: "metric", topic: `metrics.${which.toLowerCase()}`, answer: round(val), tol: 0.005,
    prompt: `A classifier's confusion counts: TP = ${c.tp}, FP = ${c.fp}, FN = ${c.fn}, TN = ${c.tn}. What is the ${which} (3 decimals)?`,
    explain: `precision = TP/(TP+FP) = ${round(precision(c), 4)}, recall = TP/(TP+FN) = ${round(recall(c), 4)}, F1 = their harmonic mean = ${round(f1(c), 4)}.`,
  };
}

export function genNdcg(rng: () => number, id: string): Card {
  const rels: number[] = Array.from({ length: 4 }, () => randInt(rng, 0, 3));
  if (!rels.some((r) => r > 0)) rels[0] = 2;
  const v = ndcg(rels);
  return {
    id, kind: "metric", topic: "retrieval.ndcg", answer: round(v), tol: 0.005,
    prompt: `A search returns documents with graded relevance ${fmt(rels)} in rank order. Using gain 2^rel - 1 and a log2(rank + 1) discount, what is nDCG@4 (3 decimals)?`,
    explain: `DCG divides each gain by log2(rank + 1); nDCG divides by the DCG of the ideal ordering. Here it is ${round(v, 4)}.`,
  };
}

export const GENERATORS = [genSoftmaxCE, genSoftmaxGrad, genBceGrad, genBroadcast, genMatmul, genLinear, genReduce, genReshape, genConv, genMetric, genNdcg] as const;
