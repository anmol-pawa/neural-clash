import { describe, it, expect } from "vitest";
import { rnnForward, rnnBptt, rnnSgd, spectralNorm, softmax, gruStep, lstmStep, zeros, zerosMat, type RnnParams, type GruParams, type LstmParams, type Mat } from "@/lib/solvers/rnn";
import { makeRunes, oneHotRunes, RUNE_VOCAB } from "@/lib/datasets/runes";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32) * 2 - 1;
}
const rmat = (r: number, c: number, f: () => number, sc: number): Mat => Array.from({ length: r }, () => Array.from({ length: c }, () => f() * sc));

function init(D: number, H: number, C: number, seed: number, sc = 0.6): RnnParams {
  const f = rng(seed);
  return { Wx: rmat(H, D, f, sc), Wh: rmat(H, H, f, sc), b: Array.from({ length: H }, () => f() * 0.1), Wo: rmat(C, H, f, sc), bo: zeros(C) };
}
const seqs = (T: number, D: number, f: () => number) => Array.from({ length: T }, () => Array.from({ length: D }, () => f()));

describe("rnn BPTT", () => {
  it("matches central finite differences for every parameter", () => {
    const f = rng(5);
    const p = init(3, 4, 3, 11);
    const xs = seqs(6, 3, f);
    const g = rnnBptt(p, xs, 2);
    const eps = 1e-6;
    let checked = 0;
    const check = (get: (q: RnnParams) => number[], idx: number, analytic: number) => {
      const plus = structuredClone(p), minus = structuredClone(p);
      get(plus)[idx] += eps;
      get(minus)[idx] -= eps;
      const num = (rnnForward(plus, xs, 2).loss - rnnForward(minus, xs, 2).loss) / (2 * eps);
      expect(Math.abs(num - analytic)).toBeLessThan(1e-6 * Math.max(1, Math.abs(num)));
      checked++;
    };
    for (const k of ["Wx", "Wh", "Wo"] as const)
      p[k].forEach((row, i) => row.forEach((_, j) => check((q) => q[k][i], j, g[k][i][j])));
    for (const k of ["b", "bo"] as const) p[k].forEach((_, i) => check((q) => q[k], i, g[k][i]));
    expect(checked).toBe(12 + 16 + 12 + 4 + 3);
  });
  it("loss equals -log softmax of the logits", () => {
    const p = init(2, 3, 2, 3);
    const tr = rnnForward(p, seqs(4, 2, rng(1)), 1);
    expect(tr.loss).toBeCloseTo(-Math.log(softmax(tr.logits)[1]), 12);
    expect(tr.probs.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  });
  it("gradient signal vanishes with distance when the recurrent weights contract", () => {
    const H = 6;
    const p = init(2, H, 2, 7);
    p.Wh = p.Wh.map((r) => r.map((v) => v * 0.5)); // spectral norm well below 1
    expect(spectralNorm(p.Wh)).toBeLessThan(1);
    const g = rnnBptt(p, seqs(30, 2, rng(2)), 0);
    const n = g.hiddenGradNorms;
    expect(n[29]).toBeGreaterThan(n[15]);
    expect(n[15]).toBeGreaterThan(n[0]);
    expect(n[0] / n[29]).toBeLessThan(1e-3);
  });
  it("gradient signal grows when the recurrent weights expand (exploding)", () => {
    const p = init(2, 4, 2, 9);
    p.Wh = [[2.5, 0, 0, 0], [0, 2.5, 0, 0], [0, 0, 2.5, 0], [0, 0, 0, 2.5]];
    p.b = zeros(4);
    // small inputs keep tanh near its linear region so the expansion shows
    const xs = seqs(12, 2, rng(4)).map((v) => v.map((x) => x * 0.01));
    const n = rnnBptt(p, xs, 1).hiddenGradNorms;
    expect(n[0]).toBeGreaterThan(n[11]);
  });
  it("SGD learns the first-token recall task at short length", () => {
    const set = makeRunes(64, "first", 4, 21);
    const V = RUNE_VOCAB.first;
    const oh = oneHotRunes(set);
    let p = init(V, 8, 4, 13, 0.4);
    const sample = (i: number) => Array.from({ length: 4 }, (_, t) => Array.from({ length: V }, (_, v) => oh[(i * 4 + t) * V + v]));
    const meanLoss = (q: RnnParams) => Array.from({ length: 64 }, (_, i) => rnnForward(q, sample(i), set.y[i]).loss).reduce((a, b) => a + b, 0) / 64;
    const before = meanLoss(p);
    for (let epoch = 0; epoch < 150; epoch++)
      for (let i = 0; i < 64; i++) p = rnnSgd(p, rnnBptt(p, sample(i), set.y[i]), 0.1);
    expect(meanLoss(p)).toBeLessThan(before * 0.5);
  });
});

describe("spectralNorm", () => {
  it("matches known values", () => {
    expect(spectralNorm([[3, 0], [0, 1]])).toBeCloseTo(3, 6);
    expect(spectralNorm([[1, 1], [1, 1]])).toBeCloseTo(2, 6);
    expect(spectralNorm(zerosMat(2, 2))).toBe(0);
  });
});

describe("gated cells", () => {
  const H = 3, D = 2;
  const f = rng(17);
  const mk = () => rmat(H, D + H, f, 0.5);
  it("GRU: update gate saturated at 1 copies the old state; at 0 takes the candidate", () => {
    const base = { Wz: zerosMat(H, D + H), Wr: mk(), Wn: mk(), bz: zeros(H), br: zeros(H), bn: zeros(H) };
    const h = [0.3, -0.5, 0.8];
    const x = [0.2, -0.1];
    const keep = gruStep({ ...base, bz: [50, 50, 50] }, x, h);
    keep.h.forEach((v, i) => expect(v).toBeCloseTo(h[i], 10));
    const take = gruStep({ ...base, bz: [-50, -50, -50] }, x, h);
    take.h.forEach((v, i) => expect(v).toBeCloseTo(take.n[i], 10));
  });
  it("GRU: reset gate at 0 ignores the old state in the candidate", () => {
    const p: GruParams = { Wz: mk(), Wr: zerosMat(H, D + H), Wn: mk(), bz: zeros(H), br: [-50, -50, -50], bn: zeros(H) };
    const a = gruStep(p, [0.4, 0.1], [0.9, 0.9, 0.9]).n;
    const b = gruStep(p, [0.4, 0.1], [-0.9, 0.2, 0.0]).n;
    a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 10));
  });
  it("LSTM: forget=1, input=0 preserves the cell exactly (the constant error carousel)", () => {
    const p: LstmParams = { Wi: zerosMat(H, D + H), Wf: zerosMat(H, D + H), Wo: mk(), Wg: mk(), bi: [-60, -60, -60], bf: [60, 60, 60], bo: zeros(H), bg: zeros(H) };
    let c = [1.5, -2, 0.25];
    let h = zeros(H);
    const c0 = c.slice();
    for (let t = 0; t < 100; t++) ({ h, c } = lstmStep(p, [0.5, -0.5], h, c));
    c.forEach((v, i) => expect(v).toBeCloseTo(c0[i], 8));
  });
  it("LSTM: output gate bounds h by tanh range; outputs are finite for large pre-activations", () => {
    const p: LstmParams = { Wi: mk(), Wf: mk(), Wo: mk(), Wg: mk(), bi: [900, 900, 900], bf: zeros(H), bo: [-900, 900, 0], bg: zeros(H) };
    const r = lstmStep(p, [5, -5], [1, 1, 1], [100, -100, 0]);
    r.h.forEach((v) => { expect(Number.isFinite(v)).toBe(true); expect(Math.abs(v)).toBeLessThanOrEqual(1); });
    expect(r.h[0]).toBeCloseTo(0, 10);
  });
});
