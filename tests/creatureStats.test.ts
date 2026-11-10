import { describe, expect, it } from "vitest";
import { FEATURE_SD, POWER_NOISE_SD, POWER_WEIGHTS, SPECIES_MEANS, generateCreatureStats } from "@/lib/datasets/creatureStats";

/** Normal equations with an intercept, solved by Gauss-Jordan elimination (test-local). */
function olsFit(X: number[][], y: number[]): { w: number[]; b: number } {
  const d = X[0].length + 1;
  const A = Array.from({ length: d }, () => new Array<number>(d + 1).fill(0));
  X.forEach((row, i) => {
    const a = [...row, 1];
    for (let p = 0; p < d; p++) {
      for (let q = 0; q < d; q++) A[p][q] += a[p] * a[q];
      A[p][d] += a[p] * y[i];
    }
  });
  for (let c = 0; c < d; c++) {
    let piv = c;
    for (let r = c + 1; r < d; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    [A[c], A[piv]] = [A[piv], A[c]];
    for (let r = 0; r < d; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let q = c; q <= d; q++) A[r][q] -= f * A[c][q];
    }
  }
  const theta = A.map((row, i) => row[d] / row[i]);
  return { w: theta.slice(0, d - 1), b: theta[d - 1] };
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[]) => Math.sqrt(mean(xs.map((x) => (x - mean(xs)) ** 2)));

describe("Creature Stats generator", () => {
  const rows = generateCreatureStats(6000, 7);

  it("is deterministic per seed and differs across seeds", () => {
    expect(generateCreatureStats(50, 7)).toEqual(generateCreatureStats(50, 7));
    expect(generateCreatureStats(50, 8)).not.toEqual(generateCreatureStats(50, 7));
  });

  it("draws the three species about equally often", () => {
    for (let s = 0; s < 3; s++) expect(rows.filter((r) => r.species === s).length / rows.length).toBeCloseTo(1 / 3, 1);
  });

  it("matches the documented per-species means and spread", () => {
    for (let s = 0; s < 3; s++) {
      const g = rows.filter((r) => r.species === s);
      const [mh, mw, ms] = SPECIES_MEANS[s];
      expect(Math.abs(mean(g.map((r) => r.height)) - mh)).toBeLessThan(0.6);
      expect(Math.abs(mean(g.map((r) => r.weight)) - mw)).toBeLessThan(0.6);
      expect(Math.abs(mean(g.map((r) => r.speed)) - ms)).toBeLessThan(0.6);
      expect(Math.abs(sd(g.map((r) => r.height)) - FEATURE_SD)).toBeLessThan(0.5);
    }
  });

  it("the power target is recoverable by least squares up to the documented noise", () => {
    const X = rows.map((r) => [r.height, r.weight, r.speed]);
    const fit = olsFit(X, rows.map((r) => r.power));
    expect(fit.w[0]).toBeCloseTo(POWER_WEIGHTS.height, 1);
    expect(fit.w[1]).toBeCloseTo(POWER_WEIGHTS.weight, 1);
    expect(fit.w[2]).toBeCloseTo(POWER_WEIGHTS.speed, 1);
    const resid = rows.map((r, i) => r.power - (fit.w[0] * X[i][0] + fit.w[1] * X[i][1] + fit.w[2] * X[i][2] + fit.b));
    expect(Math.abs(sd(resid) - POWER_NOISE_SD)).toBeLessThan(0.2);
  });

  it("classes overlap, so the task is not trivially separable", () => {
    // Nearest-mean accuracy should be high but below 100%.
    let ok = 0;
    for (const r of rows) {
      const d = SPECIES_MEANS.map(([a, b, c]) => (r.height - a) ** 2 + (r.weight - b) ** 2 + (r.speed - c) ** 2);
      ok += d.indexOf(Math.min(...d)) === r.species ? 1 : 0;
    }
    expect(ok / rows.length).toBeGreaterThan(0.8);
    expect(ok / rows.length).toBeLessThan(0.99);
  });
});
