import { describe, it, expect } from "vitest";
import { initParams, bptt, unroll, oneHotSeq, paramCount, stepForward, initState, rng, type CellKind, type Params } from "@/lib/solvers/rnn";

const KINDS: CellKind[] = ["rnn", "gru", "lstm"];

/** Central-difference gradient of the loss w.r.t. every parameter entry. */
function numericGrads(kind: CellKind, p: Params, xs: number[][], target: number, eps = 1e-6): Params {
  const out: Params = {};
  for (const [name, m] of Object.entries(p)) {
    out[name] = m.map((row, i) =>
      row.map((_, j) => {
        const orig = p[name][i][j];
        p[name][i][j] = orig + eps;
        const lp = unroll(kind, p, xs, target).loss;
        p[name][i][j] = orig - eps;
        const lm = unroll(kind, p, xs, target).loss;
        p[name][i][j] = orig;
        return (lp - lm) / (2 * eps);
      }),
    );
  }
  return out;
}

function randomSeq(T: number, D: number, seed: number): number[][] {
  const r = rng(seed);
  return Array.from({ length: T }, () => Array.from({ length: D }, () => r() * 2 - 1));
}

describe("BPTT gradients match central finite differences", () => {
  for (const kind of KINDS) {
    it(`${kind}: every parameter, T=5`, () => {
      const p = initParams(kind, 3, 4, 2, 7, 0.9);
      // non-zero biases so their gradients are exercised too
      for (const [k, m] of Object.entries(p)) if (k.startsWith("b")) m[0] = m[0].map((_, i) => 0.1 * (i + 1) - 0.2);
      const xs = randomSeq(5, 3, 11);
      const analytic = bptt(kind, p, xs, 1).grads;
      const numeric = numericGrads(kind, p, xs, 1);
      for (const name of Object.keys(p))
        analytic[name].forEach((row, i) => row.forEach((v, j) => expect(v).toBeCloseTo(numeric[name][i][j], 6)));
    });
    it(`${kind}: input gradients`, () => {
      const p = initParams(kind, 3, 4, 2, 5, 1);
      const xs = randomSeq(4, 3, 3);
      const res = bptt(kind, p, xs, 0);
      for (let t = 0; t < xs.length; t++) {
        let sq = 0;
        for (let d = 0; d < 3; d++) {
          const eps = 1e-6;
          xs[t][d] += eps; const lp = unroll(kind, p, xs, 0).loss;
          xs[t][d] -= 2 * eps; const lm = unroll(kind, p, xs, 0).loss;
          xs[t][d] += eps;
          sq += ((lp - lm) / (2 * eps)) ** 2;
        }
        expect(res.inputGradNorm[t]).toBeCloseTo(Math.sqrt(sq), 6);
      }
    });
  }
});

describe("hand-checked cells", () => {
  it("rnn with zero weights stays at tanh(bias)", () => {
    const p = initParams("rnn", 2, 2, 2, 1);
    for (const k of ["Wxh", "Whh"]) p[k] = p[k].map((r) => r.map(() => 0));
    p.bh = [[0.5, -0.5]];
    const c = stepForward("rnn", p, [1, 1], initState("rnn", 2));
    expect(c.next.h[0]).toBeCloseTo(Math.tanh(0.5), 12);
    expect(c.next.h[1]).toBeCloseTo(Math.tanh(-0.5), 12);
  });
  it("gru update gate z=0 copies the old state; z=1 replaces it with the candidate", () => {
    const p = initParams("gru", 2, 2, 2, 1);
    p.bz = [[-50, 50]]; // z ~ [0, 1]
    for (const k of ["Wz", "Uz"]) p[k] = p[k].map((r) => r.map(() => 0));
    const prev = { h: [0.3, -0.4] };
    const c = stepForward("gru", p, [0.2, 0.1], prev);
    expect(c.next.h[0]).toBeCloseTo(0.3, 10);
    expect(c.next.h[1]).toBeCloseTo(c.a.n[1], 10);
  });
  it("lstm forget gate ~1 and input gate ~0 carries the cell unchanged", () => {
    const p = initParams("lstm", 2, 2, 2, 1);
    p.bf = [[50, 50]];
    p.bi = [[-50, -50]];
    for (const k of ["Wf", "Uf", "Wi", "Ui"]) p[k] = p[k].map((r) => r.map(() => 0));
    const c = stepForward("lstm", p, [1, -1], { h: [0.1, 0.2], c: [0.7, -0.9] });
    expect(c.next.c![0]).toBeCloseTo(0.7, 10);
    expect(c.next.c![1]).toBeCloseTo(-0.9, 10);
  });
  it("softmax readout probabilities sum to 1 and loss is -log p", () => {
    const p = initParams("rnn", 2, 3, 4, 2);
    const u = unroll("rnn", p, randomSeq(3, 2, 1), 2);
    expect(u.probs.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(u.loss).toBeCloseTo(-Math.log(u.probs[2]), 12);
  });
});

describe("vanishing gradients", () => {
  const T = 30;
  const xs = oneHotSeq(Array.from({ length: T }, (_, i) => i % 3), 3);
  it("vanilla RNN with a contractive recurrent matrix: gradient to step 1 is far below step T", () => {
    const p = initParams("rnn", 3, 8, 2, 4, 0.15 / Math.sqrt(8) * 3);
    const { gradNormByStep: g } = bptt("rnn", p, xs, 0);
    expect(g[T - 1]).toBeGreaterThan(1e-3);
    expect(g[0] / g[T - 1]).toBeLessThan(1e-6);
  });
  it("norm decays roughly geometrically (monotone beyond the first few steps)", () => {
    const p = initParams("rnn", 3, 8, 2, 4, 0.1);
    const { gradNormByStep: g } = bptt("rnn", p, xs, 0);
    for (let t = 1; t < T - 1; t++) expect(g[t]).toBeLessThanOrEqual(g[t + 1] * 1.0001 + 1e-300);
  });
  it("large recurrent weights without saturation make the gradient grow backwards (tiny T, near-linear regime)", () => {
    const small = oneHotSeq([0, 0, 0, 0, 0, 0], 3).map((v) => v.map((x) => x * 0.01));
    const p = initParams("rnn", 3, 8, 2, 4, 3);
    const { gradNormByStep: g } = bptt("rnn", p, small, 0);
    expect(g[0]).toBeGreaterThan(g[5]);
  });
  it("a GRU with the update gate closed (z~0) preserves gradient to step 1; the vanilla RNN does not", () => {
    const rec = 0.1;
    const gru = initParams("gru", 3, 8, 2, 4, rec);
    gru.bz = [new Array(8).fill(-6)]; // z ~ 0.0025: state is mostly copied
    const rnn = initParams("rnn", 3, 8, 2, 4, rec);
    const gg = bptt("gru", gru, xs, 0).gradNormByStep;
    const rg = bptt("rnn", rnn, xs, 0).gradNormByStep;
    expect(gg[0] / gg[T - 1]).toBeGreaterThan(0.05);
    expect(rg[0] / rg[T - 1]).toBeLessThan(1e-10);
  });
  it("an LSTM with forget-gate bias +3 carries gradient far better than with bias -3", () => {
    const keep = initParams("lstm", 3, 8, 2, 4, 0.1);
    keep.bf = [new Array(8).fill(3)];
    const drop = initParams("lstm", 3, 8, 2, 4, 0.1);
    drop.bf = [new Array(8).fill(-3)];
    const gk = bptt("lstm", keep, xs, 0).gradNormByStep;
    const gd = bptt("lstm", drop, xs, 0).gradNormByStep;
    expect(gk[0] / gk[T - 1]).toBeGreaterThan(1000 * (gd[0] / gd[T - 1]));
  });
});

describe("parameter counts", () => {
  it("match the initialised tensors", () => {
    for (const kind of KINDS) {
      const p = initParams(kind, 5, 7, 3);
      const n = Object.values(p).reduce((s, m) => s + m.reduce((a, r) => a + r.length, 0), 0);
      expect(paramCount(kind, 5, 7, 3)).toBe(n);
    }
  });
  it("gru and lstm cells are 3x and 4x the vanilla cell (gate count)", () => {
    const cell = (k: CellKind) => paramCount(k, 5, 7, 3) - (3 * 7 + 3);
    expect(cell("gru")).toBe(3 * cell("rnn"));
    expect(cell("lstm")).toBe(4 * cell("rnn"));
  });
});
