// Pure solvers for Recurrent Rapids (CUR F9): an unrolled vanilla RNN with BPTT, the gradient-norm-vs-time probe
// behind the vanishing-gradient demo, and the GRU/LSTM gate maths. Everything is plain arrays so tests can
// cross-check it against central finite differences, independently of the Python Lab.

export type Mat = number[][];
export type Vec = number[];

export interface RnnParams { Wxh: Mat; Whh: Mat; bh: Vec; Why: Mat; by: Vec }
export interface RnnForward { hs: Vec[]; logits: Vec; probs: Vec; loss: number }
export interface RnnGrads { Wxh: Mat; Whh: Mat; bh: Vec; Why: Mat; by: Vec; /** dL/dh_t for t = 1..T (index 0 is h_1). */ dh: Vec[] }

const zeros = (n: number): Vec => new Array<number>(n).fill(0);
const zerosMat = (r: number, c: number): Mat => Array.from({ length: r }, () => zeros(c));
const matVec = (M: Mat, v: Vec): Vec => M.map((row) => row.reduce((s, w, j) => s + w * v[j], 0));
const matTVec = (M: Mat, v: Vec): Vec => M[0].map((_, j) => M.reduce((s, row, i) => s + row[j] * v[i], 0));
const add = (a: Vec, b: Vec): Vec => a.map((x, i) => x + b[i]);
const norm = (v: Vec): number => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
const sigmoid = (z: number): number => 1 / (1 + Math.exp(-z));

function softmax(z: Vec): Vec {
  const m = Math.max(...z);
  const e = z.map((v) => Math.exp(v - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
}

/** h_t = tanh(Wxh x_t + Whh h_{t-1} + bh); class logits and softmax cross-entropy read from the last hidden state only. */
export function rnnForward(p: RnnParams, xs: Vec[], target: number): RnnForward {
  let h = zeros(p.bh.length);
  const hs: Vec[] = [];
  for (const x of xs) {
    h = add(add(matVec(p.Wxh, x), matVec(p.Whh, h)), p.bh).map(Math.tanh);
    hs.push(h);
  }
  const logits = add(matVec(p.Why, h), p.by);
  const probs = softmax(logits);
  return { hs, logits, probs, loss: -Math.log(probs[target]) };
}

/** Backpropagation through time for the last-step classifier above. Gradients are summed over time steps (shared weights). */
export function rnnBackward(p: RnnParams, xs: Vec[], target: number): RnnGrads {
  const { hs, probs } = rnnForward(p, xs, target);
  const H = p.bh.length;
  const g: RnnGrads = {
    Wxh: zerosMat(H, xs[0].length), Whh: zerosMat(H, H), bh: zeros(H),
    Why: zerosMat(p.by.length, H), by: zeros(p.by.length), dh: xs.map(() => zeros(H)),
  };
  const dlogits = probs.map((q, i) => q - (i === target ? 1 : 0));
  const T = xs.length;
  g.by = dlogits.slice();
  g.Why = dlogits.map((d) => hs[T - 1].map((h) => d * h));
  let dh = matTVec(p.Why, dlogits);
  for (let t = T - 1; t >= 0; t--) {
    g.dh[t] = dh.slice();
    const dz = dh.map((d, j) => d * (1 - hs[t][j] ** 2)); // through tanh
    const hPrev = t > 0 ? hs[t - 1] : zeros(H);
    for (let j = 0; j < H; j++) {
      g.bh[j] += dz[j];
      for (let i = 0; i < xs[t].length; i++) g.Wxh[j][i] += dz[j] * xs[t][i];
      for (let k = 0; k < H; k++) g.Whh[j][k] += dz[j] * hPrev[k];
    }
    dh = matTVec(p.Whh, dz); // flows to h_{t-1}
  }
  return g;
}

/** ||dL/dh_t|| for t = 1..T: the vanishing/exploding-gradient probe. A long task has to push signal back this far. */
export function gradNormVsTime(p: RnnParams, xs: Vec[], target: number): number[] {
  return rnnBackward(p, xs, target).dh.map(norm);
}

/** Geometric factor the gradient norm is multiplied by for each step travelled backwards in time (<1 vanishing, >1 exploding). */
export function decayPerStep(norms: readonly number[]): number {
  const a = norms[0], b = norms[norms.length - 1];
  return Math.pow(a / b, 1 / (norms.length - 1));
}

/** Largest singular value (spectral norm) of a matrix via power iteration on M^T M; bounds how much one step can stretch a gradient. */
export function spectralNorm(M: Mat, iters = 200): number {
  let v = zeros(M[0].length).map((_, i) => 1 + 0.1 * i);
  for (let k = 0; k < iters; k++) {
    const w = matTVec(M, matVec(M, v));
    const n = norm(w);
    if (n === 0) return 0;
    v = w.map((x) => x / n);
  }
  return norm(matVec(M, v));
}

export interface GruParams { Wz: Mat; Uz: Mat; bz: Vec; Wr: Mat; Ur: Mat; br: Vec; Wh: Mat; Uh: Mat; bh: Vec }
export interface GruStep { z: Vec; r: Vec; cand: Vec; h: Vec }

/** GRU step: z = update gate, r = reset gate, h = (1-z)*h_prev + z*cand (the "carry" convention used in the Lab). */
export function gruStep(p: GruParams, x: Vec, hPrev: Vec): GruStep {
  const z = add(add(matVec(p.Wz, x), matVec(p.Uz, hPrev)), p.bz).map(sigmoid);
  const r = add(add(matVec(p.Wr, x), matVec(p.Ur, hPrev)), p.br).map(sigmoid);
  const gated = hPrev.map((h, i) => r[i] * h);
  const cand = add(add(matVec(p.Wh, x), matVec(p.Uh, gated)), p.bh).map(Math.tanh);
  return { z, r, cand, h: hPrev.map((h, i) => (1 - z[i]) * h + z[i] * cand[i]) };
}

export interface LstmParams { Wi: Mat; Ui: Mat; bi: Vec; Wf: Mat; Uf: Mat; bf: Vec; Wo: Mat; Uo: Mat; bo: Vec; Wg: Mat; Ug: Mat; bg: Vec }
export interface LstmStep { i: Vec; f: Vec; o: Vec; g: Vec; c: Vec; h: Vec }

/** LSTM step: c = f*c_prev + i*g (additive cell update), h = o*tanh(c). */
export function lstmStep(p: LstmParams, x: Vec, hPrev: Vec, cPrev: Vec): LstmStep {
  const gate = (W: Mat, U: Mat, b: Vec) => add(add(matVec(W, x), matVec(U, hPrev)), b);
  const i = gate(p.Wi, p.Ui, p.bi).map(sigmoid);
  const f = gate(p.Wf, p.Uf, p.bf).map(sigmoid);
  const o = gate(p.Wo, p.Uo, p.bo).map(sigmoid);
  const g = gate(p.Wg, p.Ug, p.bg).map(Math.tanh);
  const c = cPrev.map((cp, k) => f[k] * cp + i[k] * g[k]);
  return { i, f, o, g, c, h: c.map((v, k) => o[k] * Math.tanh(v)) };
}

/** Direct cell-state path dc_T/dc_0 = prod f_t (the "constant error carousel"). Excludes paths through h. */
export function cellPathGain(forgetGates: readonly number[]): number {
  return forgetGates.reduce((a, f) => a * f, 1);
}

/** Per-step shrink factor of a plain tanh RNN gradient when the recurrent matrix has spectral norm s and activations sit near zero. */
export const vanillaGainBound = (s: number, steps: number): number => s ** steps;

/** Parameter counts: vanilla RNN, GRU (3 blocks) and LSTM (4 blocks) for input size d and hidden size h. */
export const rnnParams = (d: number, h: number): number => h * (d + h) + h;
export const gruParams = (d: number, h: number): number => 3 * rnnParams(d, h);
export const lstmParams = (d: number, h: number): number => 4 * rnnParams(d, h);
