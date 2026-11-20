import { describe, it, expect } from "vitest";
import { blockParams, blockFlops, attentionFlopShare, attentionCrossoverT, modelParams } from "@/lib/solvers/transformer";

describe("block counting (same hand values as the forge-block Lab)", () => {
  it("d=8, d_ff=32", () => {
    expect(blockParams({ dModel: 8, dFF: 32 })).toBe(256 + 552 + 32);
    expect(blockFlops(4, { dModel: 8, dFF: 32 })).toBe(6656);
  });
  it("~12 d^2 parameters when d_ff = 4d", () => {
    const d = 1024;
    expect(blockParams({ dModel: d, dFF: 4 * d }) / (12 * d * d)).toBeCloseTo(1, 2);
  });
  it("attention share grows with T and crosses 50% at the crossover length", () => {
    const s = { dModel: 64, dFF: 256 };
    const t = attentionCrossoverT(s);
    expect(t).toBe((8 * 64 * 64 + 4 * 64 * 256) / (4 * 64)); // 2d + f = 384
    expect(t).toBe(2 * 64 + 256);
    expect(attentionFlopShare(t, s)).toBeCloseTo(0.5, 12);
    expect(attentionFlopShare(64, s)).toBeLessThan(attentionFlopShare(4096, s));
  });
  it("model parameters: tied embeddings save vocab * d", () => {
    const o = { dModel: 8, dFF: 32, vocab: 100, layers: 3 };
    expect(modelParams(o)).toBe(100 * 8 * 2 + 3 * 840 + 16);
    expect(modelParams(o) - modelParams({ ...o, tied: true })).toBe(800);
  });
});
