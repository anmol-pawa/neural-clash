import { describe, expect, it } from "vitest";
import { creatureStats, HABITAT_RARE } from "../lib/datasets/creatureStats";

const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
const corr = (a: number[], b: number[]) => {
  const ma = mean(a), mb = mean(b);
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < a.length; i++) {
    sab += (a[i] - ma) * (b[i] - mb);
    saa += (a[i] - ma) ** 2;
    sbb += (b[i] - mb) ** 2;
  }
  return sab / Math.sqrt(saa * sbb);
};

describe("Creature Stats dataset", () => {
  const rows = creatureStats(40000, 11);
  it("is reproducible and seed-dependent", () => {
    expect(creatureStats(50, 3)).toEqual(creatureStats(50, 3));
    expect(creatureStats(50, 3)).not.toEqual(creatureStats(50, 4));
  });
  it("is imbalanced: rare is about 8-9%, so 'always common' scores about 91-92%", () => {
    const p = mean(rows.map((r) => r.rare));
    expect(p).toBeGreaterThan(0.07);
    expect(p).toBeLessThan(0.1);
  });
  it("plants the leak: the ranger flag almost determines the label", () => {
    const flagged = rows.filter((r) => r.caught_by_rare_ranger === 1);
    const precision = mean(flagged.map((r) => r.rare));
    const recall = mean(rows.filter((r) => r.rare === 1).map((r) => r.caught_by_rare_ranger));
    expect(recall).toBeGreaterThan(0.93);
    expect(precision).toBeGreaterThan(0.2); // 2% of 91% commons also flagged: leak is strong, not perfect
    expect(corr(rows.map((r) => r.caught_by_rare_ranger), rows.map((r) => r.rare))).toBeGreaterThan(0.4);
  });
  it("plants the confounder: level predicts rarity overall but not within a habitat", () => {
    const overall = corr(rows.map((r) => r.level), rows.map((r) => r.rare));
    expect(overall).toBeGreaterThan(0.03);
    for (const h of [0, 1, 2]) {
      const g = rows.filter((r) => r.habitat === h);
      expect(Math.abs(corr(g.map((r) => r.level), g.map((r) => r.rare)))).toBeLessThan(0.04);
      expect(mean(g.map((r) => r.rare))).toBeCloseTo(HABITAT_RARE[h], 1);
    }
  });
  it("shimmer is the real signal", () => {
    expect(corr(rows.map((r) => r.shimmer), rows.map((r) => r.rare))).toBeGreaterThan(0.25);
    expect(Math.abs(corr(rows.map((r) => r.speed), rows.map((r) => r.rare)))).toBeLessThan(0.03);
  });
});
