import { describe, it, expect } from "vitest";
import { SOURCES, runClt, bayesTree, simulatePeeking, normalPdf, type SourceId } from "@/lib/prob/sim";
import { bayesPosterior, familywiseError } from "@/lib/solvers/probability";

describe("central limit theorem", () => {
  it.each(Object.keys(SOURCES) as SourceId[])("%s: mean of means is mu and spread is sigma/sqrt(n)", (id) => {
    const r = runClt(id, 30, 4000, 3);
    expect(r.sampleMean).toBeCloseTo(SOURCES[id].mean, 1);
    expect(r.sampleSd / r.predictedSd).toBeGreaterThan(0.93);
    expect(r.sampleSd / r.predictedSd).toBeLessThan(1.07);
  });
  it("skew shrinks as n grows (about 1/sqrt(n)) and coverage approaches 95%", () => {
    const small = runClt("exponential", 1, 6000, 5);
    const big = runClt("exponential", 100, 6000, 5);
    expect(small.skewness).toBeGreaterThan(1.6); // Exp(1) has skew 2
    expect(Math.abs(big.skewness)).toBeLessThan(0.45); // theory 2/sqrt(100) = 0.2
    expect(Math.abs(big.coverage95 - 0.95)).toBeLessThan(0.02);
  });
  it("standard error shrinks by sqrt(4) = 2 when n quadruples", () => {
    const a = runClt("uniform", 25, 5000, 9).sampleSd;
    const b = runClt("uniform", 100, 5000, 9).sampleSd;
    expect(a / b).toBeGreaterThan(1.88);
    expect(a / b).toBeLessThan(2.12);
  });
  it("histogram density integrates to 1 and is seeded", () => {
    const r = runClt("bernoulli", 20, 1000, 11);
    const area = r.hist.reduce((s, h) => s + h.density * (h.hi - h.lo), 0);
    expect(area).toBeCloseTo(1, 9);
    expect(runClt("bernoulli", 20, 1000, 11).means).toEqual(r.means);
  });
  it("normal pdf integrates to ~1 and peaks at the mean", () => {
    let a = 0;
    for (let x = -6; x < 6; x += 0.001) a += normalPdf(x, 0, 1) * 0.001;
    expect(a).toBeCloseTo(1, 4);
    expect(normalPdf(0, 0, 1)).toBeGreaterThan(normalPdf(1, 0, 1));
  });
});

describe("bayes tree", () => {
  it("counts add up and PPV equals Bayes' rule", () => {
    const t = bayesTree(0.01, 0.9, 0.95);
    expect(t.truePositives + t.falseNegatives).toBeCloseTo(t.sick, 9);
    expect(t.falsePositives + t.trueNegatives).toBeCloseTo(t.healthy, 9);
    expect(t.sick + t.healthy).toBe(t.population);
    expect(t.ppv).toBeCloseTo(bayesPosterior(0.01, 0.9, 0.05), 12);
    expect(t.ppv).toBeCloseTo(0.1538, 3); // the classic "positive test, still only ~15% sick"
  });
  it("flat prior with a perfect test gives PPV 1; zero prevalence gives NaN PPV when no positives exist", () => {
    expect(bayesTree(0.5, 1, 1).ppv).toBe(1);
    expect(bayesTree(0, 1, 1).ppv).toBeNaN();
  });
  it("higher prevalence raises PPV monotonically", () => {
    let prev = 0;
    for (const p of [0.001, 0.01, 0.1, 0.5]) { const v = bayesTree(p, 0.9, 0.9).ppv; expect(v).toBeGreaterThan(prev); prev = v; }
  });
});

describe("peeking", () => {
  it("a single planned look holds the nominal 5%", () => {
    const r = simulatePeeking(1500, 1, 600, 0.1, 0.05, 2);
    expect(r.fixedHorizonRate).toBeGreaterThan(0.035);
    expect(r.fixedHorizonRate).toBeLessThan(0.068);
    expect(r.peekingRate).toBeCloseTo(r.fixedHorizonRate, 12);
  });
  it("peeking inflates false positives well past 5% but below the independent-looks bound", () => {
    const r = simulatePeeking(1200, 10, 150, 0.1, 0.05, 4);
    expect(r.peekingRate).toBeGreaterThan(0.14);
    expect(r.peekingRate).toBeLessThan(r.independentBound);
    expect(r.independentBound).toBeCloseTo(familywiseError(10), 12);
    expect(r.fixedHorizonRate).toBeLessThan(0.075);
    expect(r.cumulativeByLook).toEqual([...r.cumulativeByLook].sort((a, b) => a - b));
    expect(r.cumulativeByLook[9]).toBe(r.peekingRate);
  });
});
