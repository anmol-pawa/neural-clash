import { describe, it, expect } from "vitest";
import { DISTS, sampleMeans, summarise, clt, histogram, freqTree, bayesPosterior, simulatePeeking, twoPropZ, normalCdf, type DistId } from "@/lib/prob/clt";

describe("CLT sampling distributions", () => {
  it.each(Object.keys(DISTS) as DistId[])("%s: mean of means ~ mu and sd ~ sigma / sqrt(n)", (id) => {
    const n = 40;
    const s = summarise(sampleMeans(id, n, 4000, 3));
    const p = clt(id, n);
    expect(s.mean).toBeCloseTo(p.mean, 1);
    expect(Math.abs(s.sd / p.se - 1)).toBeLessThan(0.08);
  });
  it("skew of the exponential's sample means fades like 2 / sqrt(n)", () => {
    const small = summarise(sampleMeans("exponential", 2, 6000, 5)).skew;
    const big = summarise(sampleMeans("exponential", 50, 6000, 5)).skew;
    expect(small).toBeGreaterThan(big);
    expect(Math.abs(big - 2 / Math.sqrt(50))).toBeLessThan(0.15);
  });
  it("is deterministic given the seed and distinct across seeds", () => {
    expect(sampleMeans("uniform", 5, 10, 1)).toEqual(sampleMeans("uniform", 5, 10, 1));
    expect(sampleMeans("uniform", 5, 10, 1)).not.toEqual(sampleMeans("uniform", 5, 10, 2));
  });
  it("histogram conserves counts and clamps outliers", () => {
    const h = histogram([-5, 0.1, 0.5, 0.99, 7], 4, 0, 1);
    expect(h.reduce((a, b) => a + b, 0)).toBe(5);
    expect(h).toEqual([2, 0, 1, 2]);
  });
});

describe("Bayes frequency tree", () => {
  it("natural frequencies agree with Bayes' rule", () => {
    const t = freqTree(0.01, 0.9, 0.05, 10000);
    expect(t).toMatchObject({ sick: 100, healthy: 9900, truePos: 90, falseNeg: 10, falsePos: 495, trueNeg: 9405 });
    expect(t.posterior).toBeCloseTo(bayesPosterior(0.01, 0.9, 0.05), 2);
    expect(t.truePos + t.falseNeg + t.falsePos + t.trueNeg).toBe(t.population);
  });
});

describe("peeking", () => {
  it("normalCdf hits known values", () => {
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
    expect(normalCdf(0)).toBeCloseTo(0.5, 9);
  });
  it("z statistic is zero for equal arms and antisymmetric", () => {
    expect(twoPropZ(10, 100, 10, 100)).toBe(0);
    expect(twoPropZ(10, 100, 20, 100)).toBeCloseTo(-twoPropZ(20, 100, 10, 100), 12);
    expect(twoPropZ(0, 50, 0, 50)).toBe(0);
  });
  it("a single planned look holds alpha near 5%", () => {
    const r = simulatePeeking({ nPerArm: 1000, looks: 1, rate: 0.1, experiments: 2000 });
    expect(r.falsePositiveRate).toBeGreaterThan(0.03);
    expect(r.falsePositiveRate).toBeLessThan(0.075);
    expect(r.falsePositiveRate).toBe(r.finalLookOnlyRate);
  });
  it("ten peeks inflate the false-positive rate well above 5% but below the independent bound", () => {
    const r = simulatePeeking({ nPerArm: 1000, looks: 10, rate: 0.1, experiments: 2000 });
    expect(r.falsePositiveRate).toBeGreaterThan(0.13);
    expect(r.falsePositiveRate).toBeLessThan(r.independentBound);
    expect(r.finalLookOnlyRate).toBeLessThan(0.075);
    expect(r.independentBound).toBeCloseTo(1 - 0.95 ** 10, 2);
  });
});
