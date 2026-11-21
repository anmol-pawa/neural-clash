import { describe, expect, it } from "vitest";
import { RAMP, demoAttention, heatColor, renderMap, rowEntropy, rowPeaks } from "@/lib/viz/attentionMap";

const toks = ["the", "cat", "sat", "on", "the", "mat"];
const base = { seed: 3, dim: 16, causal: false, scaled: true, padding: 0 };

describe("attention map", () => {
  it("rows are distributions", () => {
    const { weights } = demoAttention(toks, base);
    for (const row of weights) expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });
  it("causal mask puts exactly zero on the future and rows still sum to 1", () => {
    const { weights } = demoAttention(toks, { ...base, causal: true });
    weights.forEach((row, i) => {
      row.forEach((w, j) => { if (j > i) expect(w).toBe(0); });
      expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    });
    expect(weights[0][0]).toBeCloseTo(1, 12);
  });
  it("padding keys get zero weight", () => {
    const { weights } = demoAttention(toks, { ...base, padding: 2 });
    for (const row of weights) { expect(row[4]).toBe(0); expect(row[5]).toBe(0); }
  });
  it("is deterministic and the same token gets the same vector regardless of position", () => {
    expect(demoAttention(toks, base).weights).toEqual(demoAttention(toks, base).weights);
    const a = demoAttention(toks, base).weights;
    // positions 0 and 4 are both "the": identical query rows over identical keys (key 0 vs key 4 columns swap)
    expect(a[0][0]).toBeCloseTo(a[4][4], 10);
  });
  it("removing 1/sqrt(d) makes attention peakier (saturation)", () => {
    const scaled = rowEntropy(demoAttention(toks, { ...base, dim: 64 }).weights);
    const raw = rowEntropy(demoAttention(toks, { ...base, dim: 64, scaled: false }).weights);
    const mean = (x: number[]) => x.reduce((a, b) => a + b, 0) / x.length;
    expect(mean(raw)).toBeLessThan(mean(scaled));
  });
  it("heat ramp is monotone in brightness and hits both ends", () => {
    expect(heatColor(0)).toEqual([...RAMP[0]]);
    expect(heatColor(1)).toEqual([...RAMP[RAMP.length - 1]]);
    const lum = (c: number[]) => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
    let prev = -1;
    for (let w = 0; w <= 1.0001; w += 0.05) { const l = lum(heatColor(w)); expect(l).toBeGreaterThanOrEqual(prev); prev = l; }
  });
  it("renders cell colours, gutters and a hatch for masked cells", () => {
    const w = [[1, 0], [0.5, 0.5]];
    const mask = [[true, false], [true, true]];
    const px = renderMap(w, mask, 6);
    expect(px.width).toBe(12);
    expect(px.height).toBe(12);
    const at = (x: number, y: number) => Array.from(px.data.slice((y * 12 + x) * 4, (y * 12 + x) * 4 + 3));
    expect(at(1, 1)).toEqual([...RAMP[RAMP.length - 1]]);
    expect(at(5, 0)).toEqual([8, 12, 24]);
    const hatch = new Set([at(7, 1).join(), at(9, 1).join()]);
    expect(hatch.size).toBe(2);
  });
  it("row stats", () => {
    expect(rowPeaks([[0.25, 0.75]])).toEqual([0.75]);
    expect(rowEntropy([[0.5, 0.5]])[0]).toBeCloseTo(1, 12);
    expect(rowEntropy([[0, 0]])[0]).toBe(0);
  });
});
