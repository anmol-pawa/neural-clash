/**
 * Recurrent-net solvers: unrolled forward pass, backpropagation through time (BPTT) and the
 * per-step gradient norm used for the vanishing-gradient demo, for three cells: a vanilla tanh
 * RNN, a GRU and an LSTM. Gate conventions are stated on each cell. Every analytic gradient is
 * checked against central finite differences in tests/rnn.test.ts.
 *
 * Task shape: many-to-one. Read x_1..x_T, take the last hidden state, apply a linear readout,
 * softmax cross-entropy against one class label (the shape of the Runes tasks in lib/datasets/runes.ts).
 */

export type Mat = number[][];
export type Vec = number[];
export type CellKind = "rnn" | "gru" | "lstm";

/** All parameters are matrices; a bias is a 1 x H matrix. Names depend on the cell. */
export type Params = Record<string, Mat>;

export interface State { h: Vec; c?: Vec }

const sig = (z: number): number => 1 / (1 + Math.exp(-z));
const zeros = (n: number): Vec => new Array<number>(n).fill(0);
const zerosLike = (m: Mat): Mat => m.map((r) => zeros(r.length));

function matVec(W: Mat, v: Vec): Vec {
  return W.map((row) => row.reduce((s, w, j) => s + w * v[j], 0));
}
/** W^T v. */
function matTVec(W: Mat, v: Vec): Vec {
  const out = zeros(W[0].length);
  for (let i = 0; i < W.length; i++) for (let j = 0; j < out.length; j++) out[j] += W[i][j] * v[i];
  return out;
}
/** acc += outer(a, b). */
function addOuter(acc: Mat, a: Vec, b: Vec): void {
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) acc[i][j] += a[i] * b[j];
}
const add = (...vs: Vec[]): Vec => vs[0].map((_, i) => vs.reduce((s, v) => s + v[i], 0));
const mul = (a: Vec, b: Vec): Vec => a.map((x, i) => x * b[i]);
const addInto = (acc: Vec, v: Vec): void => { for (let i = 0; i < acc.length; i++) acc[i] += v[i]; };

export const l2 = (v: readonly number[]): number => Math.sqrt(v.reduce((s, x) => s + x * x, 0));

/** Small deterministic generator (mulberry32) so tests and demos are reproducible. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randMat(r: number, c: number, scale: number, next: () => number): Mat {
  return Array.from({ length: r }, () => Array.from({ length: c }, () => (next() * 2 - 1) * scale));
}

/**
 * Initialise parameters. `recurrentScale` multiplies the recurrent matrices so the demo can sweep
 * the spectral regime (small: vanishing, large: exploding). Input matrices use 1/sqrt(D).
 */
export function initParams(kind: CellKind, D: number, H: number, C: number, seed = 1, recurrentScale = 1 / Math.sqrt(H)): Params {
  const next = rng(seed);
  const x = (): Mat => randMat(H, D, 1 / Math.sqrt(D), next);
  const u = (): Mat => randMat(H, H, recurrentScale, next);
  const b = (): Mat => [zeros(H)];
  const readout = { Wy: randMat(C, H, 1 / Math.sqrt(H), next), by: [zeros(C)] };
  if (kind === "rnn") return { Wxh: x(), Whh: u(), bh: b(), ...readout };
  if (kind === "gru") return { Wz: x(), Uz: u(), bz: b(), Wr: x(), Ur: u(), br: b(), Wn: x(), Un: u(), bn: b(), ...readout };
  return { Wi: x(), Ui: u(), bi: b(), Wf: x(), Uf: u(), bf: b(), Wo: x(), Uo: u(), bo: b(), Wg: x(), Ug: u(), bg: b(), ...readout };
}

export const initState = (kind: CellKind, H: number): State => (kind === "lstm" ? { h: zeros(H), c: zeros(H) } : { h: zeros(H) });

/** Everything backward needs from one forward step. */
export interface StepCache {
  x: Vec;
  prev: State;
  next: State;
  /** Named intermediates (gate activations, candidates). */
  a: Record<string, Vec>;
}

/**
 * One cell step.
 *  rnn : h' = tanh(Wxh x + Whh h + b)
 *  gru : z = s(Wz x + Uz h + bz); r = s(Wr x + Ur h + br); n = tanh(Wn x + Un (r*h) + bn); h' = (1-z)*h + z*n
 *  lstm: i,f,o = s(W x + U h + b); g = tanh(Wg x + Ug h + bg); c' = f*c + i*g; h' = o*tanh(c')
 * (the GRU convention here, "z gates the new candidate", matches the original paper; some libraries swap z and 1-z.)
 */
export function stepForward(kind: CellKind, p: Params, x: Vec, prev: State): StepCache {
  const pre = (W: string, U: string, b: string, h: Vec): Vec => add(matVec(p[W], x), matVec(p[U], h), p[b][0]);
  if (kind === "rnn") {
    const h = pre("Wxh", "Whh", "bh", prev.h).map(Math.tanh);
    return { x, prev, next: { h }, a: {} };
  }
  if (kind === "gru") {
    const z = pre("Wz", "Uz", "bz", prev.h).map(sig);
    const r = pre("Wr", "Ur", "br", prev.h).map(sig);
    const rh = mul(r, prev.h);
    const n = pre("Wn", "Un", "bn", rh).map(Math.tanh);
    const h = prev.h.map((hp, i) => (1 - z[i]) * hp + z[i] * n[i]);
    return { x, prev, next: { h }, a: { z, r, rh, n } };
  }
  const i = pre("Wi", "Ui", "bi", prev.h).map(sig);
  const f = pre("Wf", "Uf", "bf", prev.h).map(sig);
  const o = pre("Wo", "Uo", "bo", prev.h).map(sig);
  const g = pre("Wg", "Ug", "bg", prev.h).map(Math.tanh);
  const c = prev.c!.map((cp, k) => f[k] * cp + i[k] * g[k]);
  const tc = c.map(Math.tanh);
  const h = o.map((ok, k) => ok * tc[k]);
  return { x, prev, next: { h, c }, a: { i, f, o, g, tc } };
}

export interface StepGrad {
  dx: Vec;
  /** Gradient flowing to the previous state. */
  dprev: State;
}

/** Backward through one step: given dL/d(next) accumulate parameter grads into `g` and return dx and dL/d(prev). */
export function stepBackward(kind: CellKind, p: Params, cache: StepCache, dnext: State, g: Params): StepGrad {
  const { x, prev, a } = cache;
  const dx = zeros(x.length);
  const dh = zeros(prev.h.length);
  /** Push a gradient on a pre-activation through its W, U, b. */
  const through = (dpre: Vec, W: string, U: string, b: string, h: Vec, dhTarget: Vec): void => {
    addOuter(g[W], dpre, x);
    addOuter(g[U], dpre, h);
    addInto(g[b][0], dpre);
    addInto(dx, matTVec(p[W], dpre));
    addInto(dhTarget, matTVec(p[U], dpre));
  };
  if (kind === "rnn") {
    const dpre = dnext.h.map((d, k) => d * (1 - cache.next.h[k] ** 2));
    through(dpre, "Wxh", "Whh", "bh", prev.h, dh);
    return { dx, dprev: { h: dh } };
  }
  if (kind === "gru") {
    const { z, r, rh, n } = a;
    const dz = dnext.h.map((d, k) => d * (n[k] - prev.h[k]));
    const dn = dnext.h.map((d, k) => d * z[k]);
    addInto(dh, dnext.h.map((d, k) => d * (1 - z[k])));
    const dnPre = dn.map((d, k) => d * (1 - n[k] ** 2));
    const drh = zeros(prev.h.length);
    through(dnPre, "Wn", "Un", "bn", rh, drh);
    const dr = drh.map((d, k) => d * prev.h[k]);
    addInto(dh, drh.map((d, k) => d * r[k]));
    through(dz.map((d, k) => d * z[k] * (1 - z[k])), "Wz", "Uz", "bz", prev.h, dh);
    through(dr.map((d, k) => d * r[k] * (1 - r[k])), "Wr", "Ur", "br", prev.h, dh);
    return { dx, dprev: { h: dh } };
  }
  const { i, f, o, g: cand, tc } = a;
  const dc = dnext.h.map((d, k) => d * o[k] * (1 - tc[k] ** 2) + (dnext.c ? dnext.c[k] : 0));
  const dO = dnext.h.map((d, k) => d * tc[k]);
  const dF = dc.map((d, k) => d * prev.c![k]);
  const dI = dc.map((d, k) => d * cand[k]);
  const dG = dc.map((d, k) => d * i[k]);
  through(dI.map((d, k) => d * i[k] * (1 - i[k])), "Wi", "Ui", "bi", prev.h, dh);
  through(dF.map((d, k) => d * f[k] * (1 - f[k])), "Wf", "Uf", "bf", prev.h, dh);
  through(dO.map((d, k) => d * o[k] * (1 - o[k])), "Wo", "Uo", "bo", prev.h, dh);
  through(dG.map((d, k) => d * (1 - cand[k] ** 2)), "Wg", "Ug", "bg", prev.h, dh);
  return { dx, dprev: { h: dh, c: dc.map((d, k) => d * f[k]) } };
}

export interface Unrolled {
  caches: StepCache[];
  logits: Vec;
  probs: Vec;
  loss: number;
}

/** Forward over a whole sequence (each x_t a vector), readout from the final hidden state. */
export function unroll(kind: CellKind, p: Params, xs: readonly Vec[], target: number): Unrolled {
  const H = p.Wy[0].length;
  let state = initState(kind, H);
  const caches: StepCache[] = [];
  for (const x of xs) {
    const cache = stepForward(kind, p, x, state);
    caches.push(cache);
    state = cache.next;
  }
  const logits = add(matVec(p.Wy, state.h), p.by[0]);
  const m = Math.max(...logits);
  const ex = logits.map((l) => Math.exp(l - m));
  const s = ex.reduce((a, b) => a + b, 0);
  const probs = ex.map((e) => e / s);
  return { caches, logits, probs, loss: -Math.log(probs[target]) };
}

export interface BpttResult {
  loss: number;
  grads: Params;
  /** ||dL/dh_t|| for t = 1..T (index 0 is the first input). The vanishing-gradient curve. */
  gradNormByStep: number[];
  /** ||dL/dx_t|| for each input: how much each input matters to the loss. */
  inputGradNorm: number[];
}

/** Full BPTT for the many-to-one task. */
export function bptt(kind: CellKind, p: Params, xs: readonly Vec[], target: number): BpttResult {
  const fwd = unroll(kind, p, xs, target);
  const g: Params = Object.fromEntries(Object.entries(p).map(([k, m]) => [k, zerosLike(m)]));
  const dlogits = fwd.probs.map((q, k) => q - (k === target ? 1 : 0));
  addOuter(g.Wy, dlogits, fwd.caches[fwd.caches.length - 1].next.h);
  addInto(g.by[0], dlogits);
  let dnext: State = { h: matTVec(p.Wy, dlogits), c: kind === "lstm" ? zeros(p.Wy[0].length) : undefined };
  const T = xs.length;
  const gradNormByStep = new Array<number>(T).fill(0);
  const inputGradNorm = new Array<number>(T).fill(0);
  for (let t = T - 1; t >= 0; t--) {
    gradNormByStep[t] = l2(dnext.h);
    const back = stepBackward(kind, p, fwd.caches[t], dnext, g);
    inputGradNorm[t] = l2(back.dx);
    dnext = back.dprev;
  }
  return { loss: fwd.loss, grads: g, gradNormByStep, inputGradNorm };
}

/** Convenience: one-hot sequence from token ids. */
export const oneHotSeq = (tokens: readonly number[], vocab: number): Vec[] => tokens.map((t) => Array.from({ length: vocab }, (_, k) => (k === t ? 1 : 0)));

/** Parameter count of a cell plus readout (for cost cards). */
export function paramCount(kind: CellKind, D: number, H: number, C: number): number {
  const gates = kind === "rnn" ? 1 : kind === "gru" ? 3 : 4;
  return gates * (H * D + H * H + H) + C * H + C;
}
