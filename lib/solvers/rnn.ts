/**
 * Recurrent-network solvers: unrolled forward pass, back-propagation through time (BPTT),
 * per-timestep gradient norms (the vanishing/exploding-gradient demo) and LSTM/GRU gate maths.
 * Pure arithmetic on small dense matrices; every gradient is checked against central finite
 * differences in tests/rnn.test.ts.
 */
import { sigmoid, bceWithLogits } from "./math";

export type Mat = number[][];
export type Vec = number[];

export interface RnnParams {
  /** Input-to-hidden (H x D). */
  wxh: Mat;
  /** Hidden-to-hidden (H x H). */
  whh: Mat;
  /** Hidden bias (H). */
  bh: Vec;
  /** Readout weights (H) for a single logit. */
  wo: Vec;
  /** Readout bias. */
  bo: number;
}

export interface RnnGrads {
  wxh: Mat;
  whh: Mat;
  bh: Vec;
  wo: Vec;
  bo: number;
}

export interface RnnTrace {
  /** hs[0] is the initial state, hs[t] the state after reading x[t-1]. Length T+1. */
  hs: Vec[];
  logit: number;
  loss: number;
}

const zeros = (n: number): Vec => new Array<number>(n).fill(0);
const zerosMat = (r: number, c: number): Mat => Array.from({ length: r }, () => zeros(c));
const matVec = (m: Mat, v: Vec): Vec => m.map((row) => row.reduce((s, w, j) => s + w * v[j], 0));
const matTVec = (m: Mat, v: Vec): Vec => {
  const out = zeros(m[0].length);
  m.forEach((row, i) => row.forEach((w, j) => (out[j] += w * v[i])));
  return out;
};
export const vecNorm = (v: Vec): number => Math.sqrt(v.reduce((s, x) => s + x * x, 0));

/** h_t = tanh(Wxh x_t + Whh h_{t-1} + b); after the last step, logit = wo . h_T + bo and BCE-with-logits loss. */
export function rnnForward(p: RnnParams, xs: readonly Vec[], label: number, h0?: Vec): RnnTrace {
  const hidden = p.bh.length;
  const hs: Vec[] = [h0 ? [...h0] : zeros(hidden)];
  for (const x of xs) {
    const a = matVec(p.wxh, x);
    const r = matVec(p.whh, hs[hs.length - 1]);
    hs.push(a.map((v, i) => Math.tanh(v + r[i] + p.bh[i])));
  }
  const last = hs[hs.length - 1];
  const logit = p.wo.reduce((s, w, i) => s + w * last[i], 0) + p.bo;
  return { hs, logit, loss: bceWithLogits(logit, label) };
}

export interface BpttResult {
  loss: number;
  grads: RnnGrads;
  /** dL/dh_t for t = 0..T (index 0 is the initial state). Its norm vs t is the vanishing-gradient curve. */
  dh: Vec[];
}

/** Back-propagation through time for the loss at the final step. */
export function rnnBptt(p: RnnParams, xs: readonly Vec[], label: number, h0?: Vec): BpttResult {
  const tr = rnnForward(p, xs, label, h0);
  const T = xs.length;
  const H = p.bh.length;
  const g: RnnGrads = {
    wxh: zerosMat(H, p.wxh[0].length),
    whh: zerosMat(H, H),
    bh: zeros(H),
    wo: zeros(H),
    bo: 0,
  };
  const dLogit = sigmoid(tr.logit) - label;
  g.bo = dLogit;
  g.wo = tr.hs[T].map((h) => dLogit * h);
  const dh: Vec[] = Array.from({ length: T + 1 }, () => zeros(H));
  dh[T] = p.wo.map((w) => dLogit * w);
  for (let t = T; t >= 1; t--) {
    const h = tr.hs[t];
    const da = dh[t].map((d, i) => d * (1 - h[i] * h[i])); // through tanh
    for (let i = 0; i < H; i++) {
      g.bh[i] += da[i];
      for (let j = 0; j < xs[t - 1].length; j++) g.wxh[i][j] += da[i] * xs[t - 1][j];
      for (let j = 0; j < H; j++) g.whh[i][j] += da[i] * tr.hs[t - 1][j];
    }
    dh[t - 1] = matTVec(p.whh, da); // the same Whh at every step: repeated multiplication
  }
  return { loss: tr.loss, grads: g, dh };
}

/** ||dL/dh_t|| for t = 1..T, i.e. how much learning signal reaches each input position. */
export const gradNormByTime = (p: RnnParams, xs: readonly Vec[], label: number): number[] =>
  rnnBptt(p, xs, label).dh.slice(1).map(vecNorm);

/**
 * Linearised gradient scaling for a scalar RNN h_t = tanh(w h_{t-1} + ...) when units are not saturated:
 * the signal shrinks (|w| < 1) or grows (|w| > 1) by about |w| per step, so after `steps` steps it is |w|^steps.
 */
export const linearGradScale = (w: number, steps: number): number => Math.abs(w) ** steps;

/** Rescale a gradient so its L2 norm is at most maxNorm (the standard fix for exploding gradients). */
export function clipByNorm(g: Vec, maxNorm: number): Vec {
  const n = vecNorm(g);
  return n > maxNorm ? g.map((x) => (x * maxNorm) / n) : [...g];
}

/* ------------------------------ gated cells ------------------------------ */

export interface LstmWeights {
  /** Each gate has input weights (H x D), recurrent weights (H x H) and bias (H). */
  f: GateW;
  i: GateW;
  o: GateW;
  g: GateW;
}
export interface GateW { wx: Mat; wh: Mat; b: Vec }
export interface LstmState { h: Vec; c: Vec }
export interface LstmStep extends LstmState { f: Vec; i: Vec; o: Vec; g: Vec }

const gate = (w: GateW, x: Vec, h: Vec): Vec => {
  const a = matVec(w.wx, x);
  const r = matVec(w.wh, h);
  return a.map((v, k) => v + r[k] + w.b[k]);
};

/** c_t = f*c_{t-1} + i*g;  h_t = o*tanh(c_t). The additive cell update is why gradients survive. */
export function lstmStep(w: LstmWeights, x: Vec, s: LstmState): LstmStep {
  const f = gate(w.f, x, s.h).map(sigmoid);
  const i = gate(w.i, x, s.h).map(sigmoid);
  const o = gate(w.o, x, s.h).map(sigmoid);
  const g = gate(w.g, x, s.h).map(Math.tanh);
  const c = s.c.map((cp, k) => f[k] * cp + i[k] * g[k]);
  const h = c.map((ck, k) => o[k] * Math.tanh(ck));
  return { h, c, f, i, o, g };
}

export interface GruWeights { z: GateW; r: GateW; n: GateW }
export interface GruStep { h: Vec; z: Vec; r: Vec; n: Vec }

/**
 * Update gate z, reset gate r, candidate n = tanh(Wx x + r * (Wh h) + b), h_t = (1 - z) * n + z * h_{t-1}
 * (the convention where z close to 1 means "keep the old state").
 */
export function gruStep(w: GruWeights, x: Vec, h: Vec): GruStep {
  const z = gate(w.z, x, h).map(sigmoid);
  const r = gate(w.r, x, h).map(sigmoid);
  const ax = matVec(w.n.wx, x);
  const ah = matVec(w.n.wh, h);
  const n = ax.map((v, k) => Math.tanh(v + r[k] * ah[k] + w.n.b[k]));
  return { h: n.map((nk, k) => (1 - z[k]) * nk + z[k] * h[k]), z, r, n };
}

/**
 * Direct cell-state path from c_T back to c_s: the product of the forget gates in between
 * (ignoring the indirect paths through h). With f close to 1 it barely decays.
 */
export const cellPathGain = (forgetGates: readonly number[]): number => forgetGates.reduce((p, f) => p * f, 1);
