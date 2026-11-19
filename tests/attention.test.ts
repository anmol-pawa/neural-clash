import { describe, it, expect } from "vitest";
import {
  softmaxRows, scaledDotAttention, scaledDotAttentionBackward, causalMask, paddingMask, andMasks, dotProductVariance, maxWeight,
  multiHeadAttention, splitHeads, mergeHeads, mhaParams, sinusoidalPE, rope, attnMatrixBytes, matmul, type Mat,
} from "@/lib/solvers/attention";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}
const randMat = (r: number, c: number, u: () => number, k = 1): Mat => Array.from({ length: r }, () => Array.from({ length: c }, () => (u() * 2 - 1) * k));
const dot = (a: readonly number[], b: readonly number[]) => a.reduce((s, v, i) => s + v * b[i], 0);

describe("softmaxRows", () => {
  it("is stable for huge scores and zeroes masked entries", () => {
    const w = softmaxRows([[1000, 1001, -Infinity], [-Infinity, -Infinity, -Infinity]]);
    expect(w[0][0] + w[0][1]).toBeCloseTo(1, 12);
    expect(w[0][2]).toBe(0);
    expect(w[0][1]).toBeCloseTo(1 / (1 + Math.exp(-1)), 12);
    expect(w[1]).toEqual([0, 0, 0]);
  });
});

describe("scaledDotAttention", () => {
  it("matches a hand computation (d=1, two keys)", () => {
    const r = scaledDotAttention([[2]], [[1], [3]], [[10], [20]]);
    const e1 = Math.exp(2), e2 = Math.exp(6);
    expect(r.weights[0][0]).toBeCloseTo(e1 / (e1 + e2), 12);
    expect(r.out[0][0]).toBeCloseTo((10 * e1 + 20 * e2) / (e1 + e2), 10);
  });
  it("causal mask: position i ignores the future, and changing it leaves the output unchanged", () => {
    const u = rng(1);
    const Q = randMat(5, 4, u), K = randMat(5, 4, u), V = randMat(5, 3, u);
    const m = causalMask(5);
    const a = scaledDotAttention(Q, K, V, m);
    for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) expect(a.weights[i][j]).toBe(0);
    const K2 = K.map((r) => [...r]), V2 = V.map((r) => [...r]);
    K2[4] = [9, 9, 9, 9]; V2[4] = [9, 9, 9];
    const b = scaledDotAttention(Q, K2, V2, m);
    for (let i = 0; i < 4; i++) a.out[i].forEach((v, c) => expect(b.out[i][c]).toBeCloseTo(v, 12));
  });
  it("padding mask gives padded keys exactly zero weight", () => {
    const u = rng(2);
    const r = scaledDotAttention(randMat(3, 4, u), randMat(6, 4, u), randMat(6, 2, u), paddingMask(3, 6, 4));
    for (const row of r.weights) { expect(row.slice(4)).toEqual([0, 0]); expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12); }
  });
  it("is permutation-equivariant in the keys/values (no position information without an encoding)", () => {
    const u = rng(3);
    const Q = randMat(2, 4, u), K = randMat(4, 4, u), V = randMat(4, 3, u);
    const perm = [2, 0, 3, 1];
    const a = scaledDotAttention(Q, K, V).out;
    const b = scaledDotAttention(Q, perm.map((i) => K[i]), perm.map((i) => V[i])).out;
    a.forEach((row, i) => row.forEach((v, c) => expect(b[i][c]).toBeCloseTo(v, 12)));
  });
  it("backward matches central finite differences for Q, K and V (with a combined mask)", () => {
    const u = rng(4);
    const nq = 4, nk = 4, dk = 3, dv = 2;
    const Q = randMat(nq, dk, u), K = randMat(nk, dk, u), V = randMat(nk, dv, u), W = randMat(nq, dv, u);
    const mask = andMasks(causalMask(4), paddingMask(4, 4, 4));
    const loss = (q: Mat, k: Mat, v: Mat) => { const o = scaledDotAttention(q, k, v, mask).out; return o.reduce((s, row, i) => s + dot(row, W[i]), 0); };
    const g = scaledDotAttentionBackward(Q, K, V, W, mask);
    const h = 1e-6;
    const check = (X: Mat, G: Mat, which: 0 | 1 | 2) => {
      for (let i = 0; i < X.length; i++) for (let j = 0; j < X[0].length; j++) {
        const plus = X.map((r) => [...r]), minus = X.map((r) => [...r]);
        plus[i][j] += h; minus[i][j] -= h;
        const args = (m: Mat): [Mat, Mat, Mat] => (which === 0 ? [m, K, V] : which === 1 ? [Q, m, V] : [Q, K, m]);
        const num = (loss(...args(plus)) - loss(...args(minus))) / (2 * h);
        expect(G[i][j]).toBeCloseTo(num, 6);
      }
    };
    check(Q, g.dQ, 0); check(K, g.dK, 1); check(V, g.dV, 2);
  });
});

describe("sqrt(d) scaling", () => {
  it("unscaled dot products have variance ~ d; scaled ones stay ~ 1", () => {
    const u = rng(5);
    const normal = () => Math.sqrt(-2 * Math.log(1 - u())) * Math.cos(2 * Math.PI * u());
    for (const d of [4, 64, 256]) {
      const s: number[] = [];
      for (let t = 0; t < 4000; t++) { let a = 0; for (let i = 0; i < d; i++) a += normal() * normal(); s.push(a); }
      const mean = s.reduce((a, b) => a + b, 0) / s.length;
      const v = s.reduce((a, b) => a + (b - mean) ** 2, 0) / s.length;
      expect(v / dotProductVariance(d)).toBeGreaterThan(0.9);
      expect(v / dotProductVariance(d)).toBeLessThan(1.1);
    }
    expect(dotProductVariance(64)).toBe(64);
  });
  it("larger score spread saturates the softmax (near one-hot), starving other keys of gradient", () => {
    const z = [1, 0.5, 0, -0.5];
    expect(maxWeight(z, 1)).toBeLessThan(0.5);
    expect(maxWeight(z, 16)).toBeGreaterThan(0.999);
  });
});

describe("multi-head attention", () => {
  it("split/merge are inverses and h=1 equals single-head attention", () => {
    const u = rng(6);
    const x = randMat(5, 8, u);
    expect(mergeHeads(splitHeads(x, 4))).toEqual(x);
    expect(() => splitHeads(x, 3)).toThrow();
    const p = { Wq: randMat(8, 8, u), Wk: randMat(8, 8, u), Wv: randMat(8, 8, u), Wo: randMat(8, 8, u) };
    const one = multiHeadAttention(x, x, p, 1, causalMask(5));
    const ref = matmul(scaledDotAttention(matmul(x, p.Wq), matmul(x, p.Wk), matmul(x, p.Wv), causalMask(5)).out, p.Wo);
    one.out.forEach((row, i) => row.forEach((v, c) => expect(v).toBeCloseTo(ref[i][c], 10)));
  });
  it("heads attend independently: one weight matrix per head, each row-stochastic", () => {
    const u = rng(7);
    const x = randMat(4, 8, u);
    const p = { Wq: randMat(8, 8, u), Wk: randMat(8, 8, u), Wv: randMat(8, 8, u), Wo: randMat(8, 8, u) };
    const r = multiHeadAttention(x, x, p, 4);
    expect(r.weights).toHaveLength(4);
    for (const w of r.weights) for (const row of w) expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(mhaParams(512)).toBe(4 * 512 * 512);
    expect(mhaParams(8, true)).toBe(4 * 64 + 32);
  });
});

describe("position encodings", () => {
  it("sinusoidal rows match the formula and are bounded", () => {
    const pe = sinusoidalPE(4, 6);
    expect(pe[0]).toEqual([0, 1, 0, 1, 0, 1]);
    expect(pe[2][0]).toBeCloseTo(Math.sin(2), 12);
    expect(pe[2][3]).toBeCloseTo(Math.cos(2 / Math.pow(10000, 2 / 6)), 12);
    expect(() => sinusoidalPE(2, 5)).toThrow();
  });
  it("sinusoidal: PE(pos+k) is a fixed linear (rotation) function of PE(pos) for each frequency pair", () => {
    const pe = sinusoidalPE(20, 8), k = 3, pos = 5;
    for (let i = 0; i < 4; i++) {
      const w = 1 / Math.pow(10000, (2 * i) / 8);
      const s = pe[pos][2 * i], c = pe[pos][2 * i + 1];
      expect(pe[pos + k][2 * i]).toBeCloseTo(s * Math.cos(k * w) + c * Math.sin(k * w), 12);
      expect(pe[pos + k][2 * i + 1]).toBeCloseTo(c * Math.cos(k * w) - s * Math.sin(k * w), 12);
    }
  });
  it("RoPE preserves norm and makes q.k depend only on the relative offset", () => {
    const u = rng(8);
    const q = randMat(1, 8, u)[0], k = randMat(1, 8, u)[0];
    expect(Math.hypot(...rope(q, 17))).toBeCloseTo(Math.hypot(...q), 12);
    expect(rope(q, 0)).toEqual(q);
    const base = dot(rope(q, 7), rope(k, 3));
    expect(dot(rope(q, 107), rope(k, 103))).toBeCloseTo(base, 9);
    expect(dot(rope(q, 12), rope(k, 3))).not.toBeCloseTo(base, 3);
  });
});

describe("attention memory", () => {
  it("grows quadratically in sequence length", () => {
    expect(attnMatrixBytes(1024, 16, 2)).toBe(16 * 1024 * 1024 * 2);
    expect(attnMatrixBytes(2048, 16, 2) / attnMatrixBytes(1024, 16, 2)).toBe(4);
    expect(attnMatrixBytes(4096, 32, 2, 8)).toBe(8 * 32 * 4096 * 4096 * 2);
  });
});
