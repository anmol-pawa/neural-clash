/**
 * Recurrent-net solvers: unrolled vanilla-RNN forward, full BPTT, the per-timestep gradient
 * norm used by the vanishing-gradient demo, and single-step LSTM / GRU gate maths.
 * Pure arithmetic on plain arrays; BPTT is checked against central finite differences in tests/rnn.test.ts.
 */
import { sigmoid, softmax } from "./math";

export type Mat = number[][];

export interface RnnParams {
  /** H x D input weights. */
  Wxh: Mat;
  /** H x H recurrent weights. */
  Whh: Mat;
  /** H hidden bias. */
  bh: number[];
  /** C x H readout weights. */
  Why: Mat;
  /** C readout bias. */
  by: number[];
}

export interface RnnForward {
  /** hs[0] is the initial state (zeros); hs[t+1] is the state after reading x[t]. */
  hs: number[][];
  logits: number[];
  probs: number[];
  loss: number;
}

const matVec = (m: Mat, v: readonly number[]): number[] => m.map((row) => row.reduce((s, w, j) => s + w * v[j], 0));
const zeros = (n: number): number[] => new Array<number>(n).fill(0);
const zerosLike = (m: Mat): Mat => m.map((r) => zeros(r.length));

/** Many-to-one vanilla RNN: h_t = tanh(Wxh x_t + Whh h_{t-1} + bh); logits = Why h_T + by; softmax cross-entropy. */
export function rnnForward(p: RnnParams, xs: readonly (readonly number[])[], target: number): RnnForward {
  const H = p.bh.length;
  const hs: number[][] = [zeros(H)];
  for (const x of xs) {
    const a = matVec(p.Wxh, x);
    const r = matVec(p.Whh, hs[hs.length - 1]);
    hs.push(a.map((v, i) => Math.tanh(v + r[i] + p.bh[i])));
  }
  const o = matVec(p.Why, hs[hs.length - 1]);
  const logits = o.map((v, i) => v + p.by[i]);
  const probs = softmax(logits);
  return { hs, logits, probs, loss: -Math.log(probs[target]) };
}

export interface RnnGrads extends RnnParams {
  /** dL/dh_t for t = 1..T (index t-1): the gradient arriving at each state. */
  dh: number[][];
  /** Euclidean norm of each dh entry, same indexing. Plot against distance from the loss. */
  dhNorm: number[];
}

/** Full backpropagation through time for the many-to-one loss. */
export function rnnBackward(p: RnnParams, xs: readonly (readonly number[])[], target: number): RnnGrads {
  const f = rnnForward(p, xs, target);
  const T = xs.length;
  const H = p.bh.length;
  const g: RnnGrads = {
    Wxh: zerosLike(p.Wxh), Whh: zerosLike(p.Whh), bh: zeros(H), Why: zerosLike(p.Why), by: zeros(p.by.length),
    dh: [], dhNorm: [],
  };
  const dlogits = f.probs.map((q, i) => q - (i === target ? 1 : 0));
  dlogits.forEach((d, c) => {
    g.by[c] += d;
    for (let j = 0; j < H; j++) g.Why[c][j] += d * f.hs[T][j];
  });
  let dh = zeros(H);
  for (let c = 0; c < dlogits.length; c++) for (let j = 0; j < H; j++) dh[j] += p.Why[c][j] * dlogits[c];
  const dhs: number[][] = new Array<number[]>(T);
  for (let t = T; t >= 1; t--) {
    dhs[t - 1] = dh;
    const h = f.hs[t];
    const da = dh.map((d, i) => d * (1 - h[i] * h[i])); // through tanh
    for (let i = 0; i < H; i++) {
      g.bh[i] += da[i];
      for (let j = 0; j < xs[t - 1].length; j++) g.Wxh[i][j] += da[i] * xs[t - 1][j];
      for (let j = 0; j < H; j++) g.Whh[i][j] += da[i] * f.hs[t - 1][j];
    }
    const next = zeros(H);
    for (let i = 0; i < H; i++) for (let j = 0; j < H; j++) next[j] += p.Whh[i][j] * da[i];
    dh = next;
  }
  g.dh = dhs;
  g.dhNorm = dhs.map((d) => Math.sqrt(d.reduce((s, v) => s + v * v, 0)));
  return g;
}

/**
 * Gradient norm reaching the state at each step, ordered by distance from the loss
 * (index 0 = last step, index T-1 = first step). The vanishing/exploding-gradient curve.
 */
export function gradNormByDistance(p: RnnParams, xs: readonly (readonly number[])[], target: number): number[] {
  return rnnBackward(p, xs, target).dhNorm.slice().reverse();
}

/** Least-squares decay rate: slope of ln(norm) per step of distance (negative = vanishing, positive = exploding). */
export function decayRate(norms: readonly number[]): number {
  const pts = norms.map((n, i) => [i, Math.log(Math.max(n, 1e-300))] as const);
  const n = pts.length;
  const mx = pts.reduce((s, q) => s + q[0], 0) / n;
  const my = pts.reduce((s, q) => s + q[1], 0) / n;
  const sxy = pts.reduce((s, q) => s + (q[0] - mx) * (q[1] - my), 0);
  const sxx = pts.reduce((s, q) => s + (q[0] - mx) ** 2, 0);
  return sxy / sxx;
}

/** Flatten params to one vector and back, so finite-difference checks can perturb any entry. */
export function flattenParams(p: RnnParams): number[] {
  return [...p.Wxh.flat(), ...p.Whh.flat(), ...p.bh, ...p.Why.flat(), ...p.by];
}
export function unflattenParams(v: readonly number[], D: number, H: number, C: number): RnnParams {
  let k = 0;
  const mat = (r: number, c: number): Mat => Array.from({ length: r }, () => Array.from({ length: c }, () => v[k++]));
  const vec = (n: number): number[] => Array.from({ length: n }, () => v[k++]);
  const Wxh = mat(H, D), Whh = mat(H, H), bh = vec(H), Why = mat(C, H), by = vec(C);
  return { Wxh, Whh, bh, Why, by };
}
export function flattenGrads(g: RnnParams): number[] {
  return flattenParams(g);
}

// ---------------------------------------------------------------------------------------------
// Gated cells (single step). Weights are passed per gate as [Wx (H x D), Wh (H x H), b (H)].
// ---------------------------------------------------------------------------------------------

export interface Gate {
  Wx: Mat;
  Wh: Mat;
  b: number[];
}

const gatePre = (g: Gate, x: readonly number[], h: readonly number[]): number[] => {
  const a = matVec(g.Wx, x);
  const r = matVec(g.Wh, h);
  return a.map((v, i) => v + r[i] + g.b[i]);
};

export interface LstmParams {
  f: Gate;
  i: Gate;
  g: Gate;
  o: Gate;
}
export interface LstmStep {
  f: number[];
  i: number[];
  g: number[];
  o: number[];
  c: number[];
  h: number[];
}

/** LSTM step: c' = f*c + i*g (additive path), h' = o*tanh(c'). */
export function lstmStep(p: LstmParams, x: readonly number[], h: readonly number[], c: readonly number[]): LstmStep {
  const f = gatePre(p.f, x, h).map(sigmoid);
  const i = gatePre(p.i, x, h).map(sigmoid);
  const g = gatePre(p.g, x, h).map(Math.tanh);
  const o = gatePre(p.o, x, h).map(sigmoid);
  const c2 = c.map((cv, k) => f[k] * cv + i[k] * g[k]);
  const h2 = c2.map((cv, k) => o[k] * Math.tanh(cv));
  return { f, i, g, o, c: c2, h: h2 };
}

export interface GruParams {
  z: Gate;
  r: Gate;
  n: Gate;
}
export interface GruStep {
  z: number[];
  r: number[];
  n: number[];
  h: number[];
}

/** GRU step: z update gate, r reset gate, n = tanh(Wx x + r*(Wh h) + b), h' = (1-z)*n + z*h. */
export function gruStep(p: GruParams, x: readonly number[], h: readonly number[]): GruStep {
  const z = gatePre(p.z, x, h).map(sigmoid);
  const r = gatePre(p.r, x, h).map(sigmoid);
  const wx = matVec(p.n.Wx, x);
  const wh = matVec(p.n.Wh, h);
  const n = wx.map((v, k) => Math.tanh(v + r[k] * wh[k] + p.n.b[k]));
  const h2 = n.map((nv, k) => (1 - z[k]) * nv + z[k] * h[k]);
  return { z, r, n, h: h2 };
}

/**
 * Closed-form gradient factor for the LSTM cell path: dc_t/dc_{t-1} = f_t (elementwise, other paths ignored).
 * Over k steps the cell gradient is the product of forget gates; with f=0.99 it keeps 0.99^k.
 */
export function cellPathGain(forgets: readonly number[]): number {
  return forgets.reduce((a, f) => a * f, 1);
}
