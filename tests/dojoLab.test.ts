import { describe, expect, it } from "vitest";
import { accuracyOf, bestThreshold, confusionAt, costOf, makeRows, normalCdf, normalQuantile, sampleSizePerArm, scoredPopulation, simulatePeeking, splitAccuracy, zCritical } from "@/lib/metrics/dojo";

describe("cost-matrix thresholds", () => {
  const pop = scoredPopulation(4000, 0.05, 2.2, 5);
  it("counts add up and flag-nothing has high accuracy but zero recall", () => {
    const none = confusionAt(pop, Infinity);
    expect(none.tp + none.fp + none.fn + none.tn).toBe(pop.length);
    expect(none.tp).toBe(0);
    expect(accuracyOf(none)).toBeGreaterThan(0.9);
  });
  it("best threshold equals a brute-force scan and moves with the cost ratio", () => {
    const m = { fp: 1, fn: 20 };
    const b = bestThreshold(pop, m);
    const brute = Math.min(...[...pop.map((r) => r.score), Infinity].map((t) => costOf(confusionAt(pop, t), m)));
    expect(b.cost).toBe(brute);
    const cheapMiss = bestThreshold(pop, { fp: 1, fn: 2 });
    expect(b.t).toBeLessThan(cheapMiss.t); // costly misses -> flag more
    expect(b.counts.tp).toBeGreaterThan(cheapMiss.counts.tp);
  });
  it("beats both extremes and the 0.5 default when misses are expensive", () => {
    const m = { fp: 1, fn: 20 };
    const b = bestThreshold(pop, m);
    expect(b.cost).toBeLessThan(costOf(confusionAt(pop, 0.5), m));
    expect(b.cost).toBeLessThan(costOf(confusionAt(pop, Infinity), m));
  });
});

describe("split leakage", () => {
  const rows = makeRows(60, 12, 11);
  it("random splits flatter the model; group and time splits expose it", () => {
    const r = splitAccuracy(rows, "random"), g = splitAccuracy(rows, "group"), t = splitAccuracy(rows, "time");
    expect(r - g).toBeGreaterThan(0.15);
    expect(r).toBeGreaterThan(t); // the time split still shares users, so it only partly deflates the score
    expect(g).toBeLessThan(0.62); // unseen users: near chance
    expect(r).toBeGreaterThan(0.68);
  });
  it("group split never shares a user between train and test", async () => {
    const { splitRows } = await import("@/lib/metrics/dojo");
    const { train, test } = splitRows(rows, "group");
    const tg = new Set(train.map((x) => x.group));
    expect(test.every((x) => !tg.has(x.group))).toBe(true);
    expect(test.length).toBeGreaterThan(0);
  });
});

describe("A/B peeking", () => {
  it("normal helpers", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
    expect(zCritical(0.05)).toBeCloseTo(1.95996, 3);
    expect(normalQuantile(0.8)).toBeCloseTo(0.84162, 3);
  });
  it("sample size for a 0.2 sd effect at 80% power is about 392 per arm", () => {
    expect(sampleSizePerArm(0.2)).toBeGreaterThanOrEqual(391);
    expect(sampleSizePerArm(0.2)).toBeLessThanOrEqual(393);
  });
  it("one look holds alpha; ten looks inflate false positives; Bonferroni restores them", () => {
    const base = { experiments: 3000, nPerArm: 1000, seed: 9 };
    const one = simulatePeeking({ ...base, looks: 1 }).rate;
    const ten = simulatePeeking({ ...base, looks: 10 }).rate;
    const fixed = simulatePeeking({ ...base, looks: 10, bonferroni: true }).rate;
    expect(one).toBeGreaterThan(0.035); expect(one).toBeLessThan(0.065);
    expect(ten).toBeGreaterThan(2 * one);
    expect(fixed).toBeLessThan(0.065);
  });
  it("a planned-size test with a real effect reaches about 80% power", () => {
    const n = sampleSizePerArm(0.2);
    const p = simulatePeeking({ experiments: 3000, nPerArm: n, looks: 1, effect: 0.2, seed: 4 }).rate;
    expect(p).toBeGreaterThan(0.74); expect(p).toBeLessThan(0.86);
  });
});
