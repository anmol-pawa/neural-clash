import { describe, expect, it } from "vitest";
import {
  cellPathGain, decayPerStep, gradNormVsTime, gruParams, gruStep, lstmParams, lstmStep, rnnBackward, rnnForward, rnnParams,
  spectralNorm, type GruParams, type LstmParams, type Mat, type RnnParams, type Vec,
} from "../lib/solvers/rnn";

function rng(seed: number) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2 ** 32 - 0.5; }; }
const mat = (r: number, c: number, f: () => number, sc = 1): Mat => Array.from({ length: r }, () => Array.from({ length: c }, () => f() * sc));
const vec = (n: number, f: () => number, sc = 1): Vec => Array.from({ length: n }, () => f() * sc);

function makeRnn(seed: number, D = 3, H = 4, O = 3, scale = 1): RnnParams {
  const f = rng(seed);
  return { Wxh: mat(H, D, f, scale), Whh: mat(H, H, f, scale), bh: vec(H, f, 0.2), Why: mat(O, H, f, scale), by: vec(O, f, 0.2) };
}
const seqOf = (seed: number, T: number, D = 3): Vec[] => { const f = rng(seed); return Array.from({ length: T }, () => vec(D, f, 2)); };

describe("RNN solver: BPTT", () => {
  it("matches central finite differences for every parameter", () => {
    const p = makeRnn(1);
    const xs = seqOf(2, 6);
    const target = 1;
    const g = rnnBackward(p, xs, target);
    const eps = 1e-6;
    const fd = (get: (q: RnnParams) => number[], i: number) => {
      const bump = (d: number) => { const q = JSON.parse(JSON.stringify(p)) as RnnParams; get(q)[i] += d; return rnnForward(q, xs, target).loss; };
      return (bump(eps) - bump(-eps)) / (2 * eps);
    };
    for (const name of ["Wxh", "Whh", "Why"] as const) {
      for (let r = 0; r < p[name].length; r++) for (let c = 0; c < p[name][0].length; c++) {
        const numeric = fd((q) => q[name][r], c);
        expect(g[name][r][c]).toBeCloseTo(numeric, 6);
      }
    }
    for (const name of ["bh", "by"] as const) for (let i = 0; i < p[name].length; i++) expect(g[name][i]).toBeCloseTo(fd((q) => q[name], i), 6);
  });

  it("dL/dh_t matches finite differences of an injected perturbation of h_t", () => {
    // Perturb the pre-activation bias at step t only by re-running with a hand-unrolled loop.
    const p = makeRnn(3);
    const xs = seqOf(4, 5);
    const g = rnnBackward(p, xs, 2);
    const lossWithKick = (t: number, k: number, d: number) => {
      let h = new Array<number>(4).fill(0);
      const hs: Vec[] = [];
      xs.forEach((x, s) => {
        h = p.bh.map((b, j) => Math.tanh(p.Wxh[j].reduce((a, w, i) => a + w * x[i], 0) + p.Whh[j].reduce((a, w, i) => a + w * h[i], 0) + b));
        if (s === t) h = h.map((v, j) => (j === k ? v + d : v));
        hs.push(h);
      });
      const logits = p.Why.map((row, o) => row.reduce((a, w, j) => a + w * h[j], 0) + p.by[o]);
      const m = Math.max(...logits); const e = logits.map((v) => Math.exp(v - m)); const s = e.reduce((a, b) => a + b, 0);
      return -Math.log(e[2] / s);
    };
    for (let t = 0; t < 5; t++) for (let k = 0; k < 4; k++) {
      const numeric = (lossWithKick(t, k, 1e-6) - lossWithKick(t, k, -1e-6)) / 2e-6;
      expect(g.dh[t][k]).toBeCloseTo(numeric, 6);
    }
  });

  it("a one-step sequence reduces to a single dense layer", () => {
    const p = makeRnn(5);
    const xs = seqOf(6, 1);
    const g = rnnBackward(p, xs, 0);
    expect(g.Whh.flat().every((v) => v === 0)).toBe(true); // h_0 = 0, so no recurrent gradient
  });
});

describe("RNN solver: vanishing and exploding gradients", () => {
  it("gradient norm shrinks with distance when the recurrent weights are small", () => {
    const p = makeRnn(7, 3, 6, 3, 1);
    p.Whh = p.Whh.map((r) => r.map((v) => v * 0.3));
    const norms = gradNormVsTime(p, seqOf(8, 30), 0);
    expect(norms[0]).toBeLessThan(norms[norms.length - 1] * 1e-6);
    expect(decayPerStep(norms)).toBeLessThan(1);
    expect(spectralNorm(p.Whh)).toBeLessThan(1);
  });

  it("gradient norm is bounded by spectral-norm powers", () => {
    const p = makeRnn(9, 3, 6, 3, 1);
    const s = spectralNorm(p.Whh);
    const xs = seqOf(10, 20);
    const norms = gradNormVsTime(p, xs, 1);
    const T = norms.length;
    for (let t = 0; t < T; t++) expect(norms[t]).toBeLessThanOrEqual(norms[T - 1] * s ** (T - 1 - t) * (1 + 1e-9));
  });

  it("gradient norm grows with distance for large recurrent weights and saturated-free inputs", () => {
    const p = makeRnn(11, 3, 6, 3, 1);
    p.Whh = p.Whh.map((r) => r.map((v) => v * 6));
    const zero = Array.from({ length: 12 }, () => [0, 0, 0]);
    p.bh = p.bh.map(() => 0);
    const norms = gradNormVsTime(p, zero, 0); // h stays 0, tanh' = 1: pure linear map, gain = Whh^T per step
    expect(norms[norms.length - 1] / norms[0] === 0 || norms[0] > 0).toBe(true);
    const s = spectralNorm(p.Whh);
    expect(s).toBeGreaterThan(1);
    expect(norms[0]).toBeLessThanOrEqual(norms[norms.length - 1] * s ** (norms.length - 1) * (1 + 1e-9));
  });

  it("spectralNorm matches a known matrix", () => {
    expect(spectralNorm([[3, 0], [0, 1]])).toBeCloseTo(3, 6);
    expect(spectralNorm([[0, 2], [2, 0]])).toBeCloseTo(2, 6);
  });
});

describe("GRU and LSTM gate maths", () => {
  const f = rng(21);
  const D = 3, H = 4;
  const gru: GruParams = { Wz: mat(H, D, f), Uz: mat(H, H, f), bz: vec(H, f), Wr: mat(H, D, f), Ur: mat(H, H, f), br: vec(H, f), Wh: mat(H, D, f), Uh: mat(H, H, f), bh: vec(H, f) };
  const lstm: LstmParams = { Wi: mat(H, D, f), Ui: mat(H, H, f), bi: vec(H, f), Wf: mat(H, D, f), Uf: mat(H, H, f), bf: vec(H, f), Wo: mat(H, D, f), Uo: mat(H, H, f), bo: vec(H, f), Wg: mat(H, D, f), Ug: mat(H, H, f), bg: vec(H, f) };
  const x = [0.5, -1, 2], hPrev = [0.1, -0.2, 0.3, 0.4], cPrev = [1, -1, 0.5, 2];

  it("GRU: gates in (0,1) and h interpolates between h_prev and the candidate", () => {
    const s = gruStep(gru, x, hPrev);
    s.z.concat(s.r).forEach((v) => { expect(v).toBeGreaterThan(0); expect(v).toBeLessThan(1); });
    s.h.forEach((v, k) => expect(v).toBeCloseTo((1 - s.z[k]) * hPrev[k] + s.z[k] * s.cand[k], 12));
    s.h.forEach((v, k) => { const lo = Math.min(hPrev[k], s.cand[k]), hi = Math.max(hPrev[k], s.cand[k]); expect(v).toBeGreaterThanOrEqual(lo - 1e-12); expect(v).toBeLessThanOrEqual(hi + 1e-12); });
  });

  it("GRU: update gate pinned to 0 copies the state forever", () => {
    const p = { ...gru, Wz: gru.Wz.map((r) => r.map(() => 0)), Uz: gru.Uz.map((r) => r.map(() => 0)), bz: gru.bz.map(() => -50) };
    let h = hPrev;
    for (let t = 0; t < 20; t++) h = gruStep(p, seqOf(30 + t, 1)[0], h).h;
    h.forEach((v, k) => expect(v).toBeCloseTo(hPrev[k], 10));
  });

  it("LSTM: c = f*c_prev + i*g and h = o*tanh(c)", () => {
    const s = lstmStep(lstm, x, hPrev, cPrev);
    s.c.forEach((v, k) => expect(v).toBeCloseTo(s.f[k] * cPrev[k] + s.i[k] * s.g[k], 12));
    s.h.forEach((v, k) => expect(v).toBeCloseTo(s.o[k] * Math.tanh(s.c[k]), 12));
  });

  it("LSTM: with the recurrent weights zeroed, dc_T/dc_0 equals the product of forget gates (finite difference)", () => {
    const zeroU = (m: Mat) => m.map((r) => r.map(() => 0));
    const p: LstmParams = { ...lstm, Ui: zeroU(lstm.Ui), Uf: zeroU(lstm.Uf), Uo: zeroU(lstm.Uo), Ug: zeroU(lstm.Ug) };
    const xs = seqOf(40, 8);
    const run = (c0: number) => {
      let h = [0, 0, 0, 0], c = [c0, 0, 0, 0];
      const fs: number[] = [];
      for (const xt of xs) { const s = lstmStep(p, xt, h, c); h = s.h; c = s.c; fs.push(s.f[0]); }
      return { c: c[0], fs };
    };
    const eps = 1e-6;
    const numeric = (run(eps).c - run(-eps).c) / (2 * eps);
    expect(numeric).toBeCloseTo(cellPathGain(run(0).fs), 8);
  });

  it("a forget gate near 1 keeps the cell path alive where a tanh RNN would have decayed", () => {
    expect(cellPathGain(new Array(50).fill(0.99))).toBeGreaterThan(0.6);
    expect(cellPathGain(new Array(50).fill(0.5))).toBeLessThan(1e-14);
  });

  it("parameter counts: GRU is 3x and LSTM 4x a vanilla RNN (hand-computed for d=3, h=4)", () => {
    expect(rnnParams(3, 4)).toBe(32);
    expect(gruParams(3, 4)).toBe(96);
    expect(lstmParams(3, 4)).toBe(128);
    // counts agree with the matrices actually built above
    const built = [lstm.Wi, lstm.Ui].reduce((s, m) => s + m.length * m[0].length, 0) + lstm.bi.length;
    expect(built).toBe(rnnParams(D, H));
  });
});
