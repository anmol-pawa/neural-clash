import { describe, expect, it } from "vitest";
import { RUNE_TASKS, isBalanced, makeRunes, oneHotRunes, runeLabel } from "../lib/datasets/runes";

const row = (s: ReturnType<typeof makeRunes>, i: number) => Array.from(s.x.subarray(i * s.T, (i + 1) * s.T));

describe("Runes dataset", () => {
  it("is deterministic per seed and differs across seeds", () => {
    for (const task of RUNE_TASKS) {
      const a = makeRunes(40, task, 8, 3), b = makeRunes(40, task, 8, 3), c = makeRunes(40, task, 8, 4);
      expect(Array.from(a.x)).toEqual(Array.from(b.x));
      expect(Array.from(a.x)).not.toEqual(Array.from(c.x));
    }
  });
  it("labels match an independent definition and tokens stay in vocab", () => {
    for (const task of RUNE_TASKS) {
      const s = makeRunes(300, task, 10, 9);
      for (let i = 0; i < s.n; i++) {
        expect(s.y[i]).toBe(runeLabel(task, row(s, i)));
        expect(s.y[i]).toBeLessThan(s.classes);
      }
      for (const t of s.x) { expect(t).toBeGreaterThanOrEqual(0); expect(t).toBeLessThan(s.vocab); }
    }
  });
  it("first = token 0; parity = brute-force XOR", () => {
    const f = makeRunes(100, "first", 6, 1);
    for (let i = 0; i < f.n; i++) expect(f.y[i]).toBe(f.x[i * 6]);
    const p = makeRunes(100, "parity", 7, 1);
    for (let i = 0; i < p.n; i++) expect(p.y[i]).toBe(row(p, i).reduce((a, b) => a + b, 0) % 2);
  });
  it("brackets are 50/50, positives balanced, negatives not", () => {
    const s = makeRunes(1000, "brackets", 12, 5);
    const pos = s.y.filter((v) => v === 1).length;
    expect(Math.abs(pos - 500)).toBeLessThan(60);
    for (let i = 0; i < s.n; i++) expect(isBalanced(row(s, i))).toBe(s.y[i] === 1);
  });
  it("isBalanced handles edge cases", () => {
    expect(isBalanced([0, 1])).toBe(true);
    expect(isBalanced([1, 0])).toBe(false);
    expect(isBalanced([0, 0, 1])).toBe(false);
    expect(isBalanced([])).toBe(true);
  });
  it("parity and first classes are near uniform", () => {
    const p = makeRunes(1000, "parity", 9, 2);
    expect(Math.abs(p.y.filter((v) => v === 1).length - 500)).toBeLessThan(60);
    const f = makeRunes(1000, "first", 9, 2);
    for (let c = 0; c < 4; c++) expect(Math.abs(f.y.filter((v) => v === c).length - 250)).toBeLessThan(50);
  });
  it("rejects bad lengths and one-hot encodes", () => {
    expect(() => makeRunes(5, "brackets", 7)).toThrow();
    expect(() => makeRunes(5, "first", 1)).toThrow();
    const s = makeRunes(3, "first", 4, 1);
    const oh = oneHotRunes(s);
    expect(oh.length).toBe(3 * 4 * 4);
    for (let i = 0; i < 12; i++) expect(oh.slice(i * 4, i * 4 + 4).reduce((a, b) => a + b, 0)).toBe(1);
  });
});
