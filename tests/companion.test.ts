import { describe, expect, it } from "vitest";
import { companionStats } from "../lib/labs/companion";

describe("companionStats", () => {
  it("maps a perfect, tiny, generalising model to near-max stats", () => {
    expect(companionStats({ r2: 1, generalisationGap: 0, params: 10 })).toEqual({ attack: 100, defence: 100, speed: 100 });
  });
  it("floors a model worse than the mean at zero attack", () => {
    expect(companionStats({ r2: -3, generalisationGap: 0, params: 10 }).attack).toBe(0);
  });
  it("penalises overfitting in defence and treats a negative gap as no penalty", () => {
    expect(companionStats({ r2: 0.9, generalisationGap: 0.1, params: 10 }).defence).toBe(50);
    expect(companionStats({ r2: 0.9, generalisationGap: -1, params: 10 }).defence).toBe(100);
  });
  it("lowers speed as parameters grow and never leaves [0,100]", () => {
    const small = companionStats({ r2: 0.5, generalisationGap: 0, params: 100 }).speed;
    const big = companionStats({ r2: 0.5, generalisationGap: 0, params: 1e9 }).speed;
    expect(small).toBeGreaterThan(big);
    expect(big).toBe(0);
    expect(companionStats({ r2: 0.5, generalisationGap: 0, params: 0 }).speed).toBe(100);
  });
});
