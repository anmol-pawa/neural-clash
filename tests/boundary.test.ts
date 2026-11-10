import { describe, expect, it } from "vitest";
import { accuracy, biasVariance, gini2, knn, logistic, makeData, polyEval, polyFit, tree } from "@/lib/classic/boundary";

describe("boundary playground", () => {
  it("is deterministic and balanced", () => {
    const a = makeData("moons", 60, 0.05, 9), b = makeData("moons", 60, 0.05, 9);
    expect(a).toEqual(b);
    expect(a.filter((p) => p.label).length).toBe(30);
  });
  it("1-NN memorises the training set; large k smooths", () => {
    const d = makeData("blobs", 80, 0.2, 2);
    expect(accuracy(knn(d, 1), d)).toBe(1);
    expect(accuracy(knn(d, 79), d)).toBeLessThan(1);
  });
  it("XOR: a linear model fails; a greedy tree needs depth 4 because the first split has no gain", () => {
    const tr = makeData("xor", 200, 0.06, 4), te = makeData("xor", 200, 0.06, 5);
    expect(accuracy(logistic(tr), te)).toBeLessThan(0.7);
    expect(accuracy(tree(tr, 2), te)).toBeLessThan(0.7);
    expect(accuracy(tree(tr, 4), te)).toBeGreaterThan(0.95);
  });
  it("logistic separates blobs; deeper trees never lose training accuracy", () => {
    const tr = makeData("blobs", 200, 0.1, 6), te = makeData("blobs", 200, 0.1, 7);
    expect(accuracy(logistic(tr), te)).toBeGreaterThan(0.95);
    const noisy = makeData("moons", 120, 0.15, 8);
    let prev = 0;
    for (let d = 0; d <= 6; d++) { const a = accuracy(tree(noisy, d), noisy); expect(a).toBeGreaterThanOrEqual(prev - 1e-12); prev = a; }
  });
  it("gini2 matches hand values", () => {
    expect(gini2(5, 5)).toBeCloseTo(0.5);
    expect(gini2(10, 0)).toBe(0);
  });
  it("polyFit recovers an exact quadratic", () => {
    const xs = [0, 0.2, 0.4, 0.6, 0.8, 1], ys = xs.map((x) => 1 + 2 * (x - 0.5) - 3 * (x - 0.5) ** 2);
    const w = polyFit(xs, ys, 2, 0);
    expect(w[0]).toBeCloseTo(1, 6); expect(w[1]).toBeCloseTo(2, 6); expect(w[2]).toBeCloseTo(-3, 6);
    expect(polyEval(w, 0.9)).toBeCloseTo(1 + 0.8 - 3 * 0.16, 6);
  });
  it("train error falls with degree while test error is U-shaped", () => {
    const bv = biasVariance(20, 0.3, 12);
    for (let i = 1; i < bv.length; i++) expect(bv[i].trainMse).toBeLessThanOrEqual(bv[i - 1].trainMse + 1e-6);
    const best = bv.reduce((a, b) => (b.testMse < a.testMse ? b : a));
    expect(best.degree).toBeGreaterThan(1);
    expect(best.degree).toBeLessThan(12);
    expect(bv[12].testMse).toBeGreaterThan(best.testMse);
    expect(bv[0].testMse).toBeGreaterThan(best.testMse);
  });
});
