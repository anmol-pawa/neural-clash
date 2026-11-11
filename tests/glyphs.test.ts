import { describe, expect, it } from "vitest";
import { GLYPH_CLASSES, GLYPH_SIZE, glyphTemplate, makeGlyphs } from "../lib/datasets/glyphs";

const D = GLYPH_SIZE * GLYPH_SIZE;
const dist = (a: ArrayLike<number>, b: ArrayLike<number>) => {
  let s = 0;
  for (let i = 0; i < D; i++) s += (a[i] - b[i]) ** 2;
  return s;
};
const slice = (g: { x: Float32Array }, i: number) => g.x.subarray(i * D, (i + 1) * D);
function nearestTemplateAccuracy(g: ReturnType<typeof makeGlyphs>): number {
  const T = GLYPH_CLASSES.map((_, c) => glyphTemplate(c));
  let ok = 0;
  for (let i = 0; i < g.n; i++) {
    let best = 0, bd = Infinity;
    T.forEach((t, c) => {
      const d = dist(slice(g, i), t);
      if (d < bd) { bd = d; best = c; }
    });
    if (best === g.y[i]) ok++;
  }
  return ok / g.n;
}

describe("Glyphs dataset", () => {
  it("is deterministic per seed and differs across seeds", () => {
    const a = makeGlyphs(30, 5), b = makeGlyphs(30, 5), c = makeGlyphs(30, 6);
    expect(Array.from(a.x)).toEqual(Array.from(b.x));
    expect(Array.from(a.y)).toEqual(Array.from(b.y));
    expect(Array.from(a.x)).not.toEqual(Array.from(c.x));
  });
  it("has the documented shape, range and roughly uniform classes", () => {
    const g = makeGlyphs(1200, 3);
    expect(g.x.length).toBe(1200 * D);
    let lo = 1, hi = 0;
    for (const v of g.x) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    expect(lo).toBeGreaterThanOrEqual(0);
    expect(hi).toBeLessThanOrEqual(1);
    const counts = GLYPH_CLASSES.map((_, c) => g.y.filter((v) => v === c).length);
    for (const k of counts) expect(Math.abs(k - 200)).toBeLessThan(45);
  });
  it("templates are distinct, non-empty and not saturated", () => {
    const T = GLYPH_CLASSES.map((_, c) => glyphTemplate(c));
    T.forEach((t) => {
      const ink = t.reduce((s, v) => s + v, 0);
      expect(ink).toBeGreaterThan(8);
      expect(ink).toBeLessThan(120);
    });
    for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) expect(dist(T[i], T[j])).toBeGreaterThan(8);
  });
  it("jitter is what makes it hard: template matching is perfect without jitter and clearly worse with it", () => {
    const clean = makeGlyphs(600, 9, { shift: 0, rotate: 0, noise: 0 });
    const hard = makeGlyphs(600, 9);
    // clean images still vary in scale and brightness, so allow a little slack
    expect(nearestTemplateAccuracy(clean)).toBeGreaterThan(0.9);
    const acc = nearestTemplateAccuracy(hard);
    expect(acc).toBeLessThan(nearestTemplateAccuracy(clean) - 0.1);
    expect(acc).toBeGreaterThan(1 / 6 + 0.1); // still learnable, not noise
  });
  it("translation keeps the amount of ink (shifts move strokes, they do not erase them)", () => {
    const ink = (g: ReturnType<typeof makeGlyphs>) => g.x.reduce((t, v) => t + v, 0) / g.n;
    const still = makeGlyphs(400, 2, { shift: 0, rotate: 0, noise: 0 });
    const moved = makeGlyphs(400, 2, { shift: 2, rotate: 0, noise: 0 });
    expect(Math.abs(ink(moved) / ink(still) - 1)).toBeLessThan(0.08);
  });
});
