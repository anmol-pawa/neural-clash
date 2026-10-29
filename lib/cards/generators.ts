import { DIAGNOSES, classifyCurves, trainCurves, type Diagnosis } from "./curves";
import { randInt, pick, rng } from "./rng";
import type { CurveCard, DeriveCard, MetricCard, ShapeCard } from "./types";
import { softmaxCEGrad, softmaxCrossEntropy, bceWithLogitsGrad, bceWithLogits, mseGrad } from "@/lib/solvers/math";
import { matmul, broadcast, conv2d, splitHeads, reshape, fmtShape } from "@/lib/solvers/shapes";
import { confusion, precision, recall, f1, ndcg, rocAuc } from "@/lib/solvers/metrics";

const r2 = (x: number) => Math.round(x * 100) / 100;

/** Gradient of softmax cross-entropy w.r.t. the logits, for random small logits. */
export function genSoftmaxCEGrad(seed: number): DeriveCard {
  const r = rng(seed);
  const n = randInt(r, 3, 4);
  const z = Array.from({ length: n }, () => r2((r() - 0.5) * 4));
  const t = randInt(r, 0, n - 1);
  return {
    id: `gen-softmax-ce-grad-${seed}`,
    kind: "derive",
    topic: "losses",
    prompt: `Logits z = [${z.join(", ")}], true class ${t} (0-based). For the loss L = -log softmax(z)[${t}], enter dL/dz for each logit (2 decimals).`,
    fields: z.map((_, i) => `dL/dz[${i}]`),
    answers: softmaxCEGrad(z, t),
    tol: 0.006,
    explanation: `The gradient is softmax(z) minus the one-hot target, so every entry is its probability except class ${t}, which is probability minus 1. The loss itself here is ${softmaxCrossEntropy(z, t).toFixed(3)}.`,
  };
}

/** Gradient of binary cross-entropy with logits for a single example. */
export function genBceGrad(seed: number): DeriveCard {
  const r = rng(seed);
  const z = r2((r() - 0.5) * 6);
  const y = r() < 0.5 ? 0 : 1;
  return {
    id: `gen-bce-grad-${seed}`,
    kind: "derive",
    topic: "losses",
    prompt: `A model outputs logit z = ${z} for an example with label y = ${y}. With BCE-with-logits, enter dL/dz (3 decimals).`,
    fields: ["dL/dz"],
    answers: [bceWithLogitsGrad(z, y)],
    tol: 0.0006,
    explanation: `dL/dz = sigmoid(z) - y, which is the prediction error in probability space. The loss is ${bceWithLogits(z, y).toFixed(3)}.`,
  };
}

/** MSE gradient w.r.t. predictions: shows the 2/n factor learners drop. */
export function genMseGrad(seed: number): DeriveCard {
  const r = rng(seed);
  const n = randInt(r, 2, 4);
  const pred = Array.from({ length: n }, () => randInt(r, -3, 5));
  const target = Array.from({ length: n }, () => randInt(r, -3, 5));
  return {
    id: `gen-mse-grad-${seed}`,
    kind: "derive",
    topic: "losses",
    prompt: `pred = [${pred.join(", ")}], target = [${target.join(", ")}]. For L = mean((pred - target)^2), enter dL/dpred (2 decimals).`,
    fields: pred.map((_, i) => `dL/dpred[${i}]`),
    answers: mseGrad(pred, target),
    tol: 0.006,
    explanation: `Differentiating the mean of squares gives 2 (pred_i - target_i) / n for each entry. The 1/n comes from the mean, the 2 from the square.`,
  };
}

const dims = [2, 3, 4, 5, 8, 16];

export function genMatmulShape(seed: number): ShapeCard {
  const r = rng(seed);
  const batch = r() < 0.5 ? [pick(r, dims)] : [];
  const m = pick(r, dims);
  const k = pick(r, dims);
  const n = pick(r, dims);
  const bad = r() < 0.3;
  const a = [...batch, m, k];
  const b = [bad ? k + 1 : k, n];
  const res = matmul(a, b);
  return {
    id: `gen-matmul-${seed}`,
    kind: "shape",
    topic: "shapes",
    prompt: `A has shape ${fmtShape(a)} and B has shape ${fmtShape(b)}. What is the shape of A @ B? Type "error" if it raises.`,
    answer: res.ok ? res.shape : null,
    explanation: res.ok
      ? `The last axis of A (${k}) matches the second-last of B, so it is contracted away. Leading axes are batch dimensions and survive.`
      : `${res.error}. The contracted dimensions must match exactly; matmul does not broadcast them.`,
  };
}

export function genBroadcastShape(seed: number): ShapeCard {
  const r = rng(seed);
  const ndim = randInt(r, 2, 3);
  const base = Array.from({ length: ndim }, () => pick(r, [1, 3, 4, 5]));
  const b = base.map((v) => (r() < 0.4 ? 1 : v));
  const trim = randInt(r, 0, ndim - 1);
  let other = b.slice(trim);
  if (r() < 0.25) other = other.map((v, i) => (i === other.length - 1 ? v + 1 + (v === 1 ? 1 : 0) : v));
  const res = broadcast(base, other);
  return {
    id: `gen-broadcast-${seed}`,
    kind: "shape",
    topic: "numpy-broadcasting",
    prompt: `x has shape ${fmtShape(base)} and y has shape ${fmtShape(other)}. What is the shape of x + y? Type "error" if it raises.`,
    answer: res.ok ? res.shape : null,
    explanation: res.ok
      ? "Shapes are aligned from the right; each pair of axes must be equal or one of them 1, and missing leading axes count as 1."
      : `${res.error}. Axes broadcast only when equal or when one is 1.`,
  };
}

export function genConvShape(seed: number): ShapeCard {
  const r = rng(seed);
  const x = [pick(r, [1, 2, 8]), pick(r, [1, 3, 16]), pick(r, [8, 28, 32]), pick(r, [8, 28, 32])];
  const o = pick(r, [4, 8, 32]);
  const k = pick(r, [1, 3, 5]);
  const stride = pick(r, [1, 2]);
  const pad = pick(r, [0, 1, 2]);
  const res = conv2d(x, o, [k, k], stride, pad);
  return {
    id: `gen-conv-${seed}`,
    kind: "shape",
    topic: "cnn",
    prompt: `A Conv2d(in=${x[1]}, out=${o}, kernel=${k}, stride=${stride}, padding=${pad}) receives ${fmtShape(x)} (N, C, H, W). What is the output shape?`,
    answer: res.ok ? res.shape : null,
    explanation: `Each spatial axis becomes floor((n + 2*padding - kernel) / stride) + 1; the channel axis becomes the number of filters (${o}) and the batch is untouched.`,
  };
}

export function genHeadsShape(seed: number): ShapeCard {
  const r = rng(seed);
  const x = [pick(r, [1, 2, 4]), pick(r, [5, 8, 16]), pick(r, [32, 48, 64])];
  const heads = pick(r, [2, 4, 8, 5]);
  const res = splitHeads(x, heads);
  return {
    id: `gen-heads-${seed}`,
    kind: "shape",
    topic: "attention",
    prompt: `Activations have shape ${fmtShape(x)} (B, T, D). After splitting into ${heads} heads as (B, H, T, D/H), what is the shape? Type "error" if it cannot be done.`,
    answer: res.ok ? res.shape : null,
    explanation: res.ok
      ? "The model width D is divided evenly among the heads, and the head axis moves before the sequence axis so attention runs per head."
      : `${res.error}. D must divide evenly by the head count.`,
  };
}

export function genReshapeShape(seed: number): ShapeCard {
  const r = rng(seed);
  const from = [pick(r, [2, 4]), pick(r, [3, 6]), pick(r, [2, 5])];
  const total = from.reduce((a, b) => a * b, 1);
  const first = pick(r, [2, 3, 4, 5, 6]);
  const to = [first, -1];
  const res = reshape(from, to);
  return {
    id: `gen-reshape-${seed}`,
    kind: "shape",
    topic: "shapes",
    prompt: `x has shape ${fmtShape(from)} (${total} elements). What is the shape of x.reshape(${first}, -1)? Type "error" if it raises.`,
    answer: res.ok ? res.shape : null,
    explanation: res.ok
      ? `The -1 is inferred as ${total} / ${first}. A reshape never changes the element count.`
      : `${res.error}. The known dimensions must divide the element count.`,
  };
}

/** A confusion table with a precision / recall / F1 question. */
export function genPrecisionRecall(seed: number): MetricCard {
  const r = rng(seed);
  const n = 12;
  const yTrue = Array.from({ length: n }, () => (r() < 0.4 ? 1 : 0));
  const yPred = yTrue.map((t) => (r() < 0.75 ? t : 1 - t));
  const c = confusion(yTrue, yPred);
  const which = pick(r, ["precision", "recall", "f1"] as const);
  const value = which === "precision" ? precision(c) : which === "recall" ? recall(c) : f1(c);
  return {
    id: `gen-prf-${which}-${seed}`,
    kind: "metric",
    topic: "metrics",
    prompt: `Compute ${which === "f1" ? "F1" : which} for the positive class (1). Round to 2 decimals.`,
    table: { head: ["i", ...yTrue.map((_, i) => String(i + 1))], rows: [["label", ...yTrue], ["pred", ...yPred]] },
    answer: Math.round(value * 100) / 100,
    places: 2,
    explanation: `Counting gives TP=${c.tp}, FP=${c.fp}, FN=${c.fn}, TN=${c.tn}. Precision = TP/(TP+FP), recall = TP/(TP+FN), F1 is their harmonic mean.`,
  };
}

export function genAuc(seed: number): MetricCard {
  const r = rng(seed);
  const n = 8;
  const yTrue = Array.from({ length: n }, (_, i): number => (i < 3 ? 1 : 0));
  const score = yTrue.map((t) => r2(0.15 + r() * 0.7 + t * 0.12));
  return {
    id: `gen-auc-${seed}`,
    kind: "metric",
    topic: "metrics",
    prompt: "Compute ROC AUC as the chance a random positive scores above a random negative (ties count half). Round to 2 decimals.",
    table: { head: ["i", ...yTrue.map((_, i) => String(i + 1))], rows: [["label", ...yTrue], ["score", ...score]] },
    answer: Math.round(rocAuc(yTrue, score) * 100) / 100,
    places: 2,
    explanation: "Compare every positive with every negative: count the pairs the model orders correctly, half-credit for ties, and divide by the number of pairs.",
  };
}

export function genNdcg(seed: number): MetricCard {
  const r = rng(seed);
  const rels = Array.from({ length: 5 }, () => randInt(r, 0, 3));
  if (Math.max(...rels) === 0) rels[2] = 2;
  return {
    id: `gen-ndcg-${seed}`,
    kind: "metric",
    topic: "retrieval-metrics",
    prompt: "A retriever returned five documents in this order with the graded relevance below. Compute nDCG@5 with gain 2^rel - 1 and a log2(rank + 1) discount. Round to 2 decimals.",
    table: { head: ["rank", "1", "2", "3", "4", "5"], rows: [["rel", ...rels]] },
    answer: Math.round(ndcg(rels, 5) * 100) / 100,
    places: 2,
    explanation: "DCG sums gain over discounted rank; nDCG divides by the DCG of the ideal ordering, so a perfect ranking scores exactly 1.",
  };
}

const CURVE_EXPLAIN: Record<Diagnosis, string> = {
  Overfitting: "Training loss keeps falling while validation loss bottoms out and climbs back up: the model is fitting noise in the few examples it has seen. Regularise, add data, or stop early at the validation minimum.",
  Underfitting: "Both curves flatten out together at a high loss. The model cannot represent the pattern, so more training will not help; add capacity or better features.",
  "Learning rate too high": "The loss explodes instead of settling: each step overshoots the minimum and lands higher up the bowl. Lower the learning rate (or clip gradients).",
  "Healthy fit": "Both curves fall together and settle at a low value with a small gap, which is what a model that generalises looks like.",
};

/** Loss curves from a real gradient-descent run; seeds are scanned until the curves classify as the intended diagnosis. */
export function genCurve(seed: number): CurveCard {
  const r = rng(seed);
  const want = pick(r, DIAGNOSES);
  // Exploded runs are clipped so the log-scale picture stays drawable; the cut is stated in the prompt.
  const clip = (xs: number[]) => xs.map((v) => (Number.isFinite(v) ? Math.min(v, 1e6) : 1e6));
  // Scan seeds until the *displayed* (downsampled, clipped) curves classify as the intended diagnosis.
  for (let j = 0; j < 200; j++) {
    const full = trainCurves(want, j === 0 ? seed : seed * 1000 + j);
    const n = full.train.length;
    const stride = Math.ceil(n / 60);
    const down = (xs: number[]) => clip(xs.filter((_, i) => i % stride === 0 || i === n - 1));
    const shown = { train: down(full.train), val: down(full.val) };
    if (classifyCurves(shown) === want) return curveCard(seed, want, { ...shown, epochs: n });
  }
  throw new Error(`no ${want} curve found for seed ${seed}`);
}

function curveCard(seed: number, want: Diagnosis, curves: CurveCard["curves"]): CurveCard {
  return {
    id: `gen-curve-${seed}`,
    kind: "curve",
    topic: "diagnosing-training",
    prompt: "These loss curves come from a real run (loss clipped at 1,000,000 for display). What do they show?",
    curves,
    choices: [...DIAGNOSES],
    answer: DIAGNOSES.indexOf(want),
    explanation: CURVE_EXPLAIN[want],
  };
}

export type GeneratorId = keyof typeof GENERATORS;

export const GENERATORS = {
  softmaxCEGrad: genSoftmaxCEGrad,
  bceGrad: genBceGrad,
  mseGrad: genMseGrad,
  matmulShape: genMatmulShape,
  broadcastShape: genBroadcastShape,
  convShape: genConvShape,
  headsShape: genHeadsShape,
  reshapeShape: genReshapeShape,
  precisionRecall: genPrecisionRecall,
  auc: genAuc,
  ndcg: genNdcg,
  curve: genCurve,
} as const;
