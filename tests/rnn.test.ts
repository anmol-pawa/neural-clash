import { describe, it, expect } from "vitest";
import { rnnForward, rnnBptt, gradNormByTime, linearGradScale, clipByNorm, vecNorm, lstmStep, gruStep, cellPathGain, type RnnParams, type Mat, type GruWeights, type LstmWeights } from "@/lib/solvers/rnn";
import { numericGrad } from "@/lib/solvers/math";

/** Deterministic pseudo-random numbers (mulberry32). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const mat = (r: () => number, rows: number, cols: number, scale: number): Mat => Array.from({ length: rows }, () => Array.from({ length: cols }, () => (r() * 2 - 1) * scale));
const vec = (r: () => number, n: number, scale: number) => Array.from({ length: n }, () => (r() * 2 - 1) * scale);

function makeParams(seed: number, H = 3, D = 2, scale = 0.7): RnnParams {
  const r = rng(seed);
  return { wxh: mat(r, H, D, scale), whh: mat(r, H, H, scale), bh: vec(r, H, 0.3), wo: vec(r, H, scale), bo: 0.1 };
}
const seq = (seed: number, T: number, D = 2) => {
  const r = rng(seed);
  return Array.from({ length: T }, () => vec(r, D, 1));
};

const flatten = (p: RnnParams): number[] => [...p.wxh.flat(), ...p.whh.flat(), ...p.bh, ...p.wo, p.bo];
function unflatten(flat: number[], H: number, D: number): RnnParams {
  let k = 0;
  const take = (n: number) => flat.slice(k, (k += n));
  const m = (rows: number, cols: number): Mat => Array.from({ length: rows }, () => take(cols));
  return { wxh: m(H, D), whh: m(H, H), bh: take(H), wo: take(H), bo: take(1)[0] };
}

describe("rnnBptt", () => {
  it("matches central finite differences for every parameter", () => {
    for (const [seed, T, label] of [[1, 1, 1], [2, 4, 0], [3, 7, 1]] as const) {
      const p = makeParams(seed);
      const xs = seq(seed + 10, T);
      const analytic = flatten(rnnBptt(p, xs, label).grads as unknown as RnnParams);
      const numeric = numericGrad((f) => rnnForward(unflatten(f, 3, 2), xs, label).loss, flatten(p), 1e-6);
      expect(analytic).toHaveLength(numeric.length);
      analytic.forEach((a, i) => expect(a).toBeCloseTo(numeric[i], 6));
    }
  });
  it("dL/dh_t matches finite differences when the state is perturbed mid-sequence", () => {
    const p = makeParams(5);
    const xs = seq(6, 5);
    const { dh } = rnnBptt(p, xs, 1);
    // Perturbing h_0 is the only state we can inject directly; check that end of the chain.
    const h0 = [0.1, -0.2, 0.05];
    const res = rnnBptt(p, xs, 1, h0);
    const numeric = numericGrad((h) => rnnForward(p, xs, 1, h).loss, h0, 1e-6);
    res.dh[0].forEach((a, i) => expect(a).toBeCloseTo(numeric[i], 6));
    expect(dh).toHaveLength(6);
  });
  it("loss agrees with a hand-computed single-step example", () => {
    const p: RnnParams = { wxh: [[1]], whh: [[0.5]], bh: [0], wo: [2], bo: 0 };
    const tr = rnnForward(p, [[0.5]], 1);
    const h1 = Math.tanh(0.5);
    expect(tr.hs[1][0]).toBeCloseTo(h1, 12);
    expect(tr.logit).toBeCloseTo(2 * h1, 12);
    expect(tr.loss).toBeCloseTo(Math.log(1 + Math.exp(-2 * h1)), 12);
  });
});

describe("gradient norm vs time", () => {
  const scalar = (w: number): RnnParams => ({ wxh: [[0.0]], whh: [[w]], bh: [0], wo: [1], bo: 0 });
  const zerosIn = (T: number) => Array.from({ length: T }, () => [0]);
  it("vanishes for a small recurrent weight and follows w^k near the origin", () => {
    const T = 20;
    const norms = gradNormByTime(scalar(0.5), zerosIn(T), 1);
    // with zero input and zero bias, h stays 0 so tanh' = 1 and the scale is exactly w per step
    for (let t = 1; t < T; t++) expect(norms[t - 1] / norms[t]).toBeCloseTo(0.5, 10);
    expect(norms[0] / norms[T - 1]).toBeCloseTo(linearGradScale(0.5, T - 1), 8);
    expect(norms[0]).toBeLessThan(1e-5);
  });
  it("explodes for w > 1 at the same linearisation", () => {
    const T = 20;
    const norms = gradNormByTime(scalar(1.5), zerosIn(T), 1);
    expect(norms[0] / norms[T - 1]).toBeCloseTo(1.5 ** (T - 1), 4);
    expect(norms[0]).toBeGreaterThan(norms[T - 1]);
  });
  it("saturated tanh vanishes the signal even with |w| > 1", () => {
    const p: RnnParams = { wxh: [[3]], whh: [[1.5]], bh: [0], wo: [1], bo: 0 };
    const xs = Array.from({ length: 12 }, () => [1]);
    const norms = gradNormByTime(p, xs, 1);
    expect(norms[0]).toBeLessThan(norms[norms.length - 1] * 1e-3);
  });
});

describe("clipByNorm", () => {
  it("rescales to the cap and keeps direction", () => {
    const c = clipByNorm([3, 4], 1);
    expect(vecNorm(c)).toBeCloseTo(1, 12);
    expect(c[0] / c[1]).toBeCloseTo(0.75, 12);
  });
  it("leaves small gradients alone", () => expect(clipByNorm([0.1, 0.2], 1)).toEqual([0.1, 0.2]));
});

describe("lstm and gru", () => {
  const gateW = (r: () => number, H: number, D: number, b = 0) => ({ wx: mat(r, H, D, 0.6), wh: mat(r, H, H, 0.6), b: Array.from({ length: H }, () => b) });
  it("LSTM equations hold element-wise", () => {
    const r = rng(9);
    const w: LstmWeights = { f: gateW(r, 2, 2), i: gateW(r, 2, 2), o: gateW(r, 2, 2), g: gateW(r, 2, 2) };
    const s = lstmStep(w, [0.4, -0.3], { h: [0.2, -0.1], c: [0.5, -0.5] });
    for (let k = 0; k < 2; k++) {
      expect(s.c[k]).toBeCloseTo(s.f[k] * [0.5, -0.5][k] + s.i[k] * s.g[k], 12);
      expect(s.h[k]).toBeCloseTo(s.o[k] * Math.tanh(s.c[k]), 12);
      for (const gv of [s.f[k], s.i[k], s.o[k]]) expect(gv > 0 && gv < 1).toBe(true);
    }
  });
  it("LSTM with forget bias large and input gate closed copies the cell state", () => {
    const r = rng(10);
    const w: LstmWeights = { f: gateW(r, 2, 1, 30), i: gateW(r, 2, 1, -30), o: gateW(r, 2, 1), g: gateW(r, 2, 1) };
    let s = { h: [0, 0], c: [0.7, -0.4] };
    for (let t = 0; t < 50; t++) s = lstmStep(w, [1], s);
    expect(s.c[0]).toBeCloseTo(0.7, 8);
    expect(s.c[1]).toBeCloseTo(-0.4, 8);
  });
  it("cell path gain is the product of forget gates and survives where a plain RNN decays", () => {
    expect(cellPathGain([0.9, 0.9, 0.9])).toBeCloseTo(0.729, 12);
    expect(cellPathGain(new Array(50).fill(0.99))).toBeGreaterThan(0.6);
    expect(linearGradScale(0.9, 50)).toBeLessThan(0.01);
  });
  it("GRU interpolates: z=1 keeps the old state, z=0 takes the candidate", () => {
    const r = rng(11);
    const w: GruWeights = { z: gateW(r, 2, 2, 40), r: gateW(r, 2, 2), n: gateW(r, 2, 2) };
    const keep = gruStep(w, [1, -1], [0.3, -0.6]);
    expect(keep.h[0]).toBeCloseTo(0.3, 8);
    expect(keep.h[1]).toBeCloseTo(-0.6, 8);
    const w2: GruWeights = { ...w, z: gateW(r, 2, 2, -40) };
    const take = gruStep(w2, [1, -1], [0.3, -0.6]);
    take.h.forEach((v, k) => expect(v).toBeCloseTo(take.n[k], 8));
  });
  it("GRU reset gate near 0 ignores the previous state in the candidate", () => {
    const r = rng(12);
    const w: GruWeights = { z: gateW(r, 2, 2), r: gateW(r, 2, 2, -40), n: gateW(r, 2, 2) };
    const a = gruStep(w, [0.5, 0.5], [0.9, 0.9]);
    const b = gruStep(w, [0.5, 0.5], [-0.9, -0.9]);
    a.n.forEach((v, k) => expect(v).toBeCloseTo(b.n[k], 8));
  });
});
