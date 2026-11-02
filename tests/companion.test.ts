import { describe, expect, it } from "vitest";
import { companionStats } from "@/lib/companion/stats";

describe("companionStats", () => {
  it("rewards held-out score, not training score", () => {
    const good = companionStats({ testScore: 0.95, trainScore: 0.96, params: 4 });
    const memoriser = companionStats({ testScore: 0.4, trainScore: 1, params: 4 });
    expect(good.attack).toBe(95);
    expect(memoriser.attack).toBe(40);
    expect(good.defence).toBeGreaterThan(memoriser.defence);
  });
  it("clamps worse-than-mean models to zero attack", () => {
    expect(companionStats({ testScore: -3, trainScore: -3, params: 10 }).attack).toBe(0);
  });
  it("gap of 0.25 or more zeroes defence", () => {
    expect(companionStats({ testScore: 0.5, trainScore: 0.75, params: 2 }).defence).toBe(0);
    expect(companionStats({ testScore: 0.9, trainScore: 0.9, params: 2 }).defence).toBe(100);
  });
  it("bigger models are slower (log scale)", () => {
    const small = companionStats({ testScore: 1, trainScore: 1, params: 10 }).speed;
    const big = companionStats({ testScore: 1, trainScore: 1, params: 1e8 }).speed;
    expect(small).toBeGreaterThan(big);
    expect(companionStats({ testScore: 1, trainScore: 1, params: 1e12 }).speed).toBe(0);
  });
  it("rejects non-finite metrics", () => {
    expect(() => companionStats({ testScore: NaN, trainScore: 1, params: 1 })).toThrow();
  });
});
