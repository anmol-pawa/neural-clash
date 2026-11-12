/**
 * Recurrent-network solvers: an unrolled vanilla RNN with a many-to-one softmax head, exact BPTT,
 * per-timestep gradient norms (the vanishing-gradient demo), and single-step GRU / LSTM gate maths.
 * Pure float64 arithmetic on plain arrays; BPTT is checked against central finite differences in
 * tests/rnn.test.ts. Matrices are row-major `number[][]`.
 */

export type Mat = number[][];
export type Vec = number[];

export interface RnnParams {
  /** Input weights, H x D. */
  Wx: Mat;
  /** Recurrent weights, H x H. */
  Wh: Mat;
  /** Hidden bias, H. */
  b: Vec;
  /** Output weights, C x H. */
  Wo: Mat;
  /** Output bias, C. */
  bo: Vec;
}

export const zeros = (n: number): Vec => new Array<number>(n).fill(0);
export const zerosMat = (r: number, c: number): Mat => Array.from({ length: r }, () => zeros(c));
const cloneMat = (m: Mat): Mat => m.map((r) => r.slice());

export function matVec(m: Mat, v: ArrayLike<number>): Vec {
  return m.map((row) => {
    let s = 0;
    for (let j = 0; j < row.length; j++) s += row[j] * v[j];
    return s;
  });
}

export const sigmoid = (x: number): number => (x >= 0 ? 1 / (1 + Math.exp(-x)) : Math.exp(x) / (1 + Math.exp(x)));

/** Numerically stable softmax. */
export function softmax(z: ArrayLike<number>): Vec {
  let m = -Infinity;
  for (let i = 0; i < z.length; i++) m = Math.max(m, z[i]);
  const e = Array.from(z, (x) => Math.exp(x - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / s);
}

export interface RnnTrace {
  /** Hidden states h_0 (zeros) .. h_T, length T+1. */
  h: Vec[];
  logits: Vec;
  probs: Vec;
  loss: number;
}

/** Forward pass over xs (T vectors of length D); cross-entropy on the final step only. */
export function rnnForward(p: RnnParams, xs: readonly Vec[], label: number): RnnTrace {
  const H = p.b.length;
  const h: Vec[] = [zeros(H)];
  for (const x of xs) {
    const a = matVec(p.Wx, x);
    const r = matVec(p.Wh, h[h.length - 1]);
    h.push(a.map((v, i) => Math.tanh(v + r[i] + p.b[i])));
  }
  const o = matVec(p.Wo, h[h.length - 1]);
  const logits = o.map((v, i) => v + p.bo[i]);
  const probs = softmax(logits);
  return { h, logits, probs, loss: -Math.log(Math.max(probs[label], 1e-300)) };
}

export interface RnnGrads extends RnnParams {
  /** ||dL/dh_t|| for t = 1..T (index t-1): how much learning signal still reaches step t. */
  hiddenGradNorms: number[];
  loss: number;
}

/** Backpropagation through time for the final-step cross-entropy loss. */
export function rnnBptt(p: RnnParams, xs: readonly Vec[], label: number): RnnGrads {
  const tr = rnnForward(p, xs, label);
  const T = xs.length;
  const H = p.b.length;
  const g: RnnGrads = {
    Wx: zerosMat(H, xs[0]?.length ?? 0),
    Wh: zerosMat(H, H),
    b: zeros(H),
    Wo: zerosMat(p.bo.length, H),
    bo: zeros(p.bo.length),
    hiddenGradNorms: zeros(T),
    loss: tr.loss,
  };
  const dlogits = tr.probs.map((q, i) => q - (i === label ? 1 : 0));
  g.bo = dlogits.slice();
  for (let c = 0; c < dlogits.length; c++) for (let j = 0; j < H; j++) g.Wo[c][j] = dlogits[c] * tr.h[T][j];
  // dL/dh_T = Wo^T dlogits
  let dh = zeros(H);
  for (let c = 0; c < dlogits.length; c++) for (let j = 0; j < H; j++) dh[j] += p.Wo[c][j] * dlogits[c];
  for (let t = T; t >= 1; t--) {
    g.hiddenGradNorms[t - 1] = Math.hypot(...dh);
    const ht = tr.h[t];
    const da = dh.map((d, i) => d * (1 - ht[i] * ht[i])); // through tanh
    for (let i = 0; i < H; i++) {
      g.b[i] += da[i];
      for (let j = 0; j < xs[t - 1].length; j++) g.Wx[i][j] += da[i] * xs[t - 1][j];
      for (let j = 0; j < H; j++) g.Wh[i][j] += da[i] * tr.h[t - 1][j];
    }
    const next = zeros(H);
    for (let i = 0; i < H; i++) for (let j = 0; j < H; j++) next[j] += p.Wh[i][j] * da[i];
    dh = next;
  }
  return g;
}

/** Plain SGD step, returning new parameters. */
export function rnnSgd(p: RnnParams, g: RnnParams, lr: number): RnnParams {
  const upd = (m: Mat, d: Mat): Mat => m.map((r, i) => r.map((v, j) => v - lr * d[i][j]));
  const updV = (v: Vec, d: Vec): Vec => v.map((x, i) => x - lr * d[i]);
  return { Wx: upd(p.Wx, g.Wx), Wh: upd(p.Wh, g.Wh), b: updV(p.b, g.b), Wo: upd(p.Wo, g.Wo), bo: updV(p.bo, g.bo) };
}

export const cloneParams = (p: RnnParams): RnnParams => ({
  Wx: cloneMat(p.Wx), Wh: cloneMat(p.Wh), b: p.b.slice(), Wo: cloneMat(p.Wo), bo: p.bo.slice(),
});

/** Largest singular value (spectral norm) by power iteration on W^T W. */
export function spectralNorm(w: Mat, iters = 200): number {
  const n = w[0]?.length ?? 0;
  let v = Array.from({ length: n }, (_, i) => 1 + 0.01 * i);
  let sigma = 0;
  for (let k = 0; k < iters; k++) {
    const u = matVec(w, v);
    const wtu = zeros(n);
    for (let i = 0; i < w.length; i++) for (let j = 0; j < n; j++) wtu[j] += w[i][j] * u[i];
    const norm = Math.hypot(...wtu);
    if (norm === 0) return 0;
    v = wtu.map((x) => x / norm);
    sigma = Math.sqrt(norm);
  }
  return sigma;
}

// ---- gated cells (single step, forward only; used by Lab checks and the gate lesson) ----

export interface GruParams {
  /** Each is H x (D+H) acting on [x; h]. Update, reset, candidate. */
  Wz: Mat; Wr: Mat; Wn: Mat;
  bz: Vec; br: Vec; bn: Vec;
}

/**
 * GRU step (convention h' = (1-z)*n + z*h; z = 1 copies the old state):
 * z = σ(Wz[x;h]+bz), r = σ(Wr[x;h]+br), n = tanh(Wn[x; r*h]+bn).
 */
export function gruStep(p: GruParams, x: Vec, h: Vec): { h: Vec; z: Vec; r: Vec; n: Vec } {
  const xh = [...x, ...h];
  const z = matVec(p.Wz, xh).map((v, i) => sigmoid(v + p.bz[i]));
  const r = matVec(p.Wr, xh).map((v, i) => sigmoid(v + p.br[i]));
  const xrh = [...x, ...h.map((v, i) => r[i] * v)];
  const n = matVec(p.Wn, xrh).map((v, i) => Math.tanh(v + p.bn[i]));
  return { h: h.map((hv, i) => (1 - z[i]) * n[i] + z[i] * hv), z, r, n };
}

export interface LstmParams {
  /** Each is H x (D+H) acting on [x; h]. Input, forget, output gates and candidate. */
  Wi: Mat; Wf: Mat; Wo: Mat; Wg: Mat;
  bi: Vec; bf: Vec; bo: Vec; bg: Vec;
}

/** LSTM step: c' = f*c + i*g, h' = o*tanh(c'). */
export function lstmStep(p: LstmParams, x: Vec, h: Vec, c: Vec): { h: Vec; c: Vec; i: Vec; f: Vec; o: Vec; g: Vec } {
  const xh = [...x, ...h];
  const i = matVec(p.Wi, xh).map((v, k) => sigmoid(v + p.bi[k]));
  const f = matVec(p.Wf, xh).map((v, k) => sigmoid(v + p.bf[k]));
  const o = matVec(p.Wo, xh).map((v, k) => sigmoid(v + p.bo[k]));
  const g = matVec(p.Wg, xh).map((v, k) => Math.tanh(v + p.bg[k]));
  const c2 = c.map((cv, k) => f[k] * cv + i[k] * g[k]);
  return { h: c2.map((cv, k) => o[k] * Math.tanh(cv)), c: c2, i, f, o, g };
}
