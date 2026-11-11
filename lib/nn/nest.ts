/** Pure Neuron Nest playground: a one-hidden-layer tanh net trained on XOR, and signal/gradient flow through deep random nets. Seeded and deterministic. */
import { rng } from "@/lib/cards/rng";
import { makeData, type Pt } from "@/lib/classic/boundary";

function gauss(u: () => number): number {
  return Math.sqrt(-2 * Math.log(1 - u())) * Math.cos(2 * Math.PI * u());
}
const sigmoid = (z: number) => (z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z)));

export interface Mlp { w1: number[][]; b1: number[]; w2: number[]; b2: number }

export function forward(m: Mlp, x: number, y: number): number {
  let z = m.b2;
  for (let j = 0; j < m.w2.length; j++) z += m.w2[j] * Math.tanh(m.w1[j][0] * x + m.w1[j][1] * y + m.b1[j]);
  return sigmoid(z);
}

export interface XorRun { model: Mlp; losses: number[]; accuracy: number; data: Pt[] }

/** Full-batch gradient descent, BCE loss. Inputs are centred to [-1,1]. hidden = 0 gives plain logistic regression. */
export function trainXor(hidden: number, steps: number, seed = 4, lr = 0.5): XorRun {
  const data = makeData("xor", 80, 0.07, seed);
  const u = rng(seed + 100);
  const X = data.map((p) => [p.x * 2 - 1, p.y * 2 - 1]);
  const t = data.map((p) => p.label);
  const H = Math.max(hidden, 0);
  const m: Mlp = {
    w1: Array.from({ length: H }, () => [gauss(u) * 0.8, gauss(u) * 0.8]),
    b1: new Array(H).fill(0),
    w2: Array.from({ length: H }, () => gauss(u) * 0.8),
    b2: 0,
  };
  // hidden = 0: a single logistic unit on (x, y) via the direct path.
  const lin = { w: [0, 0], b: 0 };
  const losses: number[] = [];
  const predict = (x: number, y: number) => {
    if (H === 0) return sigmoid(lin.w[0] * x + lin.w[1] * y + lin.b);
    return forward(m, x, y);
  };
  for (let s = 0; s < steps; s++) {
    let loss = 0;
    const g1 = m.w1.map(() => [0, 0]), gb1 = new Array(H).fill(0), g2 = new Array(H).fill(0);
    let gb2 = 0; const gl = { w: [0, 0], b: 0 };
    for (let i = 0; i < X.length; i++) {
      const [x, y] = X[i];
      const p = predict(x, y);
      loss += -(t[i] * Math.log(p + 1e-12) + (1 - t[i]) * Math.log(1 - p + 1e-12));
      const dz = (p - t[i]) / X.length;
      if (H === 0) { gl.w[0] += dz * x; gl.w[1] += dz * y; gl.b += dz; continue; }
      gb2 += dz;
      for (let j = 0; j < H; j++) {
        const h = Math.tanh(m.w1[j][0] * x + m.w1[j][1] * y + m.b1[j]);
        g2[j] += dz * h;
        const da = dz * m.w2[j] * (1 - h * h);
        g1[j][0] += da * x; g1[j][1] += da * y; gb1[j] += da;
      }
    }
    losses.push(loss / X.length);
    if (H === 0) { lin.w[0] -= lr * gl.w[0]; lin.w[1] -= lr * gl.w[1]; lin.b -= lr * gl.b; continue; }
    m.b2 -= lr * gb2;
    for (let j = 0; j < H; j++) { m.w2[j] -= lr * g2[j]; m.b1[j] -= lr * gb1[j]; m.w1[j][0] -= lr * g1[j][0]; m.w1[j][1] -= lr * g1[j][1]; }
  }
  let ok = 0;
  for (let i = 0; i < X.length; i++) ok += (predict(X[i][0], X[i][1]) > 0.5 ? 1 : 0) === t[i] ? 1 : 0;
  // Expose the logistic baseline as a degenerate Mlp-free grid via a closure-compatible model.
  const model: Mlp = H === 0 ? { w1: [[lin.w[0], lin.w[1]]], b1: [lin.b], w2: [1], b2: 0 } : m;
  return { model: H === 0 ? model : m, losses, accuracy: ok / X.length, data };
}

/** Probability grid over [0,1]^2 (row-major, y from top). For hidden = 0 the stored unit is used linearly (no tanh). */
export function probGrid(run: XorRun, hidden: number, n: number): number[] {
  const out: number[] = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const x = ((c + 0.5) / n) * 2 - 1, y = (1 - (r + 0.5) / n) * 2 - 1;
    if (hidden === 0) { const m = run.model; out.push(sigmoid(m.w1[0][0] * x + m.w1[0][1] * y + m.b1[0])); }
    else out.push(forward(run.model, x, y));
  }
  return out;
}

export type Act = "tanh" | "relu";
export type Init = "tiny" | "xavier" | "he" | "large";

export interface Flow { act: number[]; grad: number[] }

/** Std of activations (forward) and of the gradient w.r.t. each layer's output (backward) through `depth` square layers. */
export function flowByDepth(depth: number, width: number, act: Act, init: Init, seed = 7, batch = 64): Flow {
  const u = rng(seed);
  const std = init === "tiny" ? 0.01 : init === "large" ? 1 : init === "xavier" ? Math.sqrt(1 / width) : Math.sqrt(2 / width);
  const W: number[][][] = Array.from({ length: depth }, () => Array.from({ length: width }, () => Array.from({ length: width }, () => gauss(u) * std)));
  const sd = (xs: number[][]) => { const v = xs.flat(); const mu = v.reduce((a, b) => a + b, 0) / v.length; return Math.sqrt(v.reduce((a, b) => a + (b - mu) ** 2, 0) / v.length); };
  let h: number[][] = Array.from({ length: batch }, () => Array.from({ length: width }, () => gauss(u)));
  const pre: number[][][] = [], post: number[][][] = [];
  const actv: number[] = [];
  for (let l = 0; l < depth; l++) {
    const z = h.map((row) => W[l].map((wr) => wr.reduce((s, w, k) => s + w * row[k], 0)));
    const a = z.map((row) => row.map((v) => (act === "tanh" ? Math.tanh(v) : Math.max(0, v))));
    pre.push(z); post.push(a); actv.push(sd(a)); h = a;
  }
  let g: number[][] = Array.from({ length: batch }, () => Array.from({ length: width }, () => gauss(u)));
  const grad: number[] = new Array(depth);
  for (let l = depth - 1; l >= 0; l--) {
    grad[l] = sd(g);
    const dz = g.map((row, i) => row.map((v, j) => v * (act === "tanh" ? 1 - post[l][i][j] ** 2 : pre[l][i][j] > 0 ? 1 : 0)));
    g = dz.map((row) => W[l][0].map((_, k) => row.reduce((s, v, j) => s + v * W[l][j][k], 0)));
  }
  return { act: actv, grad };
}
