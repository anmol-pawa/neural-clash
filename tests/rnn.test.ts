import { describe, it, expect } from "vitest";
import {
  rnnForward, rnnBackward, gradNormByDistance, decayRate, flattenParams, unflattenParams,
  lstmStep, gruStep, cellPathGain, type RnnParams, type Gate,
} from "@/lib/solvers/rnn";

/** Tiny deterministic LCG so tests need no dependencies. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const randMat = (r: number, c: number, u: () => number, scale: number) =>
  Array.from({ length: r }, () => Array.from({ length: c }, () => (u() * 2 - 1) * scale));

function makeParams(D: number, H: number, C: number, seed: number, rec = 0.5): RnnParams {
  const u = rng(seed);
  return {
    Wxh: randMat(H, D, u, 0.8), Whh: randMat(H, H, u, rec), bh: Array.from({ length: H }, () => (u() - 0.5) * 0.2),
    Why: randMat(C, H, u, 0.8), by: Array.from({ length: C }, () => (u() - 0.5) * 0.2),
  };
}
const seq = (T: number, D: number, seed: number) => {
  const u = rng(seed);
  return Array.from({ length: T }, () => Array.from({ length: D }, () => u() * 2 - 1));
};

describe("rnnForward", () => {
  it("matches a hand computation for one scalar step", () => {
    const p: RnnParams = { Wxh: [[2]], Whh: [[0.5]], bh: [0.1], Why: [[1], [-1]], by: [0, 0] };
    const f = rnnForward(p, [[0.3], [-0.2]], 0);
    const h1 = Math.tanh(2 * 0.3 + 0.1);
    const h2 = Math.tanh(2 * -0.2 + 0.5 * h1 + 0.1);
    expect(f.hs[1][0]).toBeCloseTo(h1, 12);
    expect(f.hs[2][0]).toBeCloseTo(h2, 12);
    const l = [h2, -h2];
    const lse = Math.log(Math.exp(l[0]) + Math.exp(l[1]));
    expect(f.loss).toBeCloseTo(lse - l[0], 12);
  });
  it("with an empty sequence reads out the zero state", () => {
    const p = makeParams(2, 3, 2, 1);
    const f = rnnForward(p, [], 1);
    expect(f.hs).toHaveLength(1);
    expect(f.logits[0]).toBeCloseTo(p.by[0], 12);
  });
});

describe("rnnBackward (BPTT) vs central finite differences", () => {
  for (const [D, H, C, T, seed] of [[2, 3, 2, 1, 1], [2, 3, 2, 5, 2], [3, 4, 3, 7, 3], [1, 2, 2, 12, 4]] as const) {
    it(`D=${D} H=${H} C=${C} T=${T}`, () => {
      const p = makeParams(D, H, C, seed);
      const xs = seq(T, D, seed + 100);
      const target = seed % C;
      const analytic = flattenParams(rnnBackward(p, xs, target));
      const flat = flattenParams(p);
      const h = 1e-6;
      flat.forEach((v, k) => {
        const plus = flat.slice(); plus[k] = v + h;
        const minus = flat.slice(); minus[k] = v - h;
        const lp = rnnForward(unflattenParams(plus, D, H, C), xs, target).loss;
        const lm = rnnForward(unflattenParams(minus, D, H, C), xs, target).loss;
        const num = (lp - lm) / (2 * h);
        expect(Math.abs(num - analytic[k])).toBeLessThan(1e-7 + 1e-5 * Math.abs(num));
      });
    });
  }
  it("dh matches the finite-difference gradient of the loss w.r.t. each hidden state", () => {
    // Perturb h_t mid-sequence by re-running the tail from a perturbed state.
    const p = makeParams(2, 3, 2, 9);
    const xs = seq(6, 2, 77);
    const g = rnnBackward(p, xs, 1);
    const f = rnnForward(p, xs, 1);
    const tail = (t: number, hs: number[]) => {
      // run the remaining steps manually from state hs
      let h = hs;
      for (let s = t; s < xs.length; s++) {
        h = h.map((_, i) => Math.tanh(p.Wxh[i].reduce((a, w, j) => a + w * xs[s][j], 0) + p.Whh[i].reduce((a, w, j) => a + w * h[j], 0) + p.bh[i]));
      }
      const logits = p.Why.map((row, c) => row.reduce((a, w, j) => a + w * h[j], 0) + p.by[c]);
      const m = Math.max(...logits);
      return Math.log(logits.reduce((a, l) => a + Math.exp(l - m), 0)) + m - logits[1];
    };
    for (const t of [1, 3, 5]) {
      const base = f.hs[t];
      base.forEach((v, i) => {
        const a = base.slice(); a[i] = v + 1e-6;
        const b = base.slice(); b[i] = v - 1e-6;
        expect((tail(t, a) - tail(t, b)) / 2e-6).toBeCloseTo(g.dh[t - 1][i], 6);
      });
    }
  });
});

describe("gradient norm vs distance (vanishing / exploding)", () => {
  const norms = (rec: number) => gradNormByDistance(makeParams(3, 6, 2, 21, rec), seq(30, 3, 5), 0);
  it("is ordered from the loss backwards and has T entries", () => {
    const p = makeParams(2, 3, 2, 3);
    const g = rnnBackward(p, seq(8, 2, 3), 0);
    const byDist = gradNormByDistance(p, seq(8, 2, 3), 0);
    expect(byDist).toHaveLength(8);
    expect(byDist[0]).toBeCloseTo(g.dhNorm[7], 12);
    expect(byDist[7]).toBeCloseTo(g.dhNorm[0], 12);
  });
  it("small recurrent weights make the gradient vanish exponentially", () => {
    const n = norms(0.2);
    expect(decayRate(n)).toBeLessThan(-0.3);
    expect(n[29]).toBeLessThan(n[0] * 1e-6);
  });
  it("large recurrent weights give a much slower decay than small ones (and can explode)", () => {
    expect(decayRate(norms(3))).toBeGreaterThan(decayRate(norms(0.2)) + 0.5);
  });
  it("identity-like recurrence with linear regime keeps the norm nearly flat", () => {
    const p: RnnParams = { Wxh: [[0], [0]], Whh: [[1, 0], [0, 1]], bh: [0, 0], Why: [[1, 1], [0, 0]], by: [0, 0] };
    const n = gradNormByDistance(p, Array.from({ length: 20 }, () => [0]), 0);
    n.forEach((v) => expect(v).toBeCloseTo(n[0], 10));
    expect(decayRate(n)).toBeCloseTo(0, 10);
  });
  it("decayRate recovers a known exponential", () => {
    expect(decayRate([1, 0.5, 0.25, 0.125])).toBeCloseTo(Math.log(0.5), 12);
  });
});

const gate = (Wx: number[][], Wh: number[][], b: number[]): Gate => ({ Wx, Wh, b });
const zeroGate = (H: number, D: number, b: number): Gate => gate(Array.from({ length: H }, () => new Array(D).fill(0)), Array.from({ length: H }, () => new Array(H).fill(0)), new Array(H).fill(b));

describe("lstmStep", () => {
  it("forget=1, input=0 copies the cell state exactly", () => {
    const H = 3, D = 2;
    const p = { f: zeroGate(H, D, 40), i: zeroGate(H, D, -40), g: zeroGate(H, D, 0), o: zeroGate(H, D, 40) };
    const c = [0.7, -1.2, 3];
    const s = lstmStep(p, [0.5, -0.5], [0.1, 0.2, 0.3], c);
    s.c.forEach((v, k) => expect(v).toBeCloseTo(c[k], 10));
    s.h.forEach((v, k) => expect(v).toBeCloseTo(Math.tanh(c[k]), 10));
  });
  it("forget=0, input=1 overwrites the cell with tanh candidate", () => {
    const p = { f: zeroGate(1, 1, -40), i: zeroGate(1, 1, 40), g: gate([[2]], [[0]], [0.1]), o: zeroGate(1, 1, 0) };
    const s = lstmStep(p, [0.4], [0], [9]);
    expect(s.c[0]).toBeCloseTo(Math.tanh(0.9), 10);
    expect(s.h[0]).toBeCloseTo(0.5 * Math.tanh(Math.tanh(0.9)), 10);
  });
  it("cell path gradient is the product of forget gates", () => {
    const f = Array.from({ length: 50 }, () => 0.99);
    expect(cellPathGain(f)).toBeCloseTo(0.99 ** 50, 12);
    // finite-difference: c_T depends on c_0 through f gates only when i*g does not depend on c
    const p = { f: zeroGate(1, 1, 4.595119850134589), i: zeroGate(1, 1, 0), g: zeroGate(1, 1, 0), o: zeroGate(1, 1, 0) }; // sigmoid(4.595)=0.99
    const run = (c0: number) => { let c = [c0], h = [0]; for (let t = 0; t < 50; t++) { const s = lstmStep(p, [0], h, c); c = s.c; h = s.h; } return c[0]; };
    const num = (run(1 + 1e-6) - run(1 - 1e-6)) / 2e-6;
    expect(num).toBeCloseTo(0.99 ** 50, 6);
  });
});

describe("gruStep", () => {
  it("update gate z=1 keeps the old state, z=0 takes the candidate", () => {
    const keep = gruStep({ z: zeroGate(2, 1, 40), r: zeroGate(2, 1, 0), n: gate([[1], [1]], [[0, 0], [0, 0]], [0, 0]) }, [0.5], [0.3, -0.6]);
    keep.h.forEach((v, k) => expect(v).toBeCloseTo([0.3, -0.6][k], 10));
    const take = gruStep({ z: zeroGate(2, 1, -40), r: zeroGate(2, 1, 0), n: gate([[1], [1]], [[0, 0], [0, 0]], [0, 0]) }, [0.5], [0.3, -0.6]);
    take.h.forEach((v) => expect(v).toBeCloseTo(Math.tanh(0.5), 10));
  });
  it("reset gate r=0 hides the old state from the candidate; r=1 exposes it", () => {
    const Wh = [[1]];
    const mk = (rb: number) => gruStep({ z: zeroGate(1, 1, -40), r: zeroGate(1, 1, rb), n: gate([[0]], Wh, [0]) }, [0], [0.8]);
    expect(mk(-40).n[0]).toBeCloseTo(0, 10);
    expect(mk(40).n[0]).toBeCloseTo(Math.tanh(0.8), 10);
  });
  it("matches a hand computation with all gates at 0.5", () => {
    const p = { z: zeroGate(1, 1, 0), r: zeroGate(1, 1, 0), n: gate([[1]], [[1]], [0]) };
    const s = gruStep(p, [0.2], [0.6]);
    const n = Math.tanh(0.2 + 0.5 * 0.6);
    expect(s.h[0]).toBeCloseTo(0.5 * n + 0.5 * 0.6, 12);
  });
});
