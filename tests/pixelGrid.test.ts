import { describe, expect, it } from "vitest";
import { parseGrid } from "@/lib/pixelGrid";

describe("parseGrid", () => {
  const palette = { a: "#ff0000", b: "#00ff10" };
  it("maps characters to RGBA and leaves '.' transparent", () => {
    const s = parseGrid(["a.", ".b"], palette);
    expect([s.width, s.height]).toEqual([2, 2]);
    expect(Array.from(s.rgba.slice(0, 4))).toEqual([255, 0, 0, 255]);
    expect(s.rgba[7]).toBe(0);
    expect(Array.from(s.rgba.slice(12, 16))).toEqual([0, 255, 16, 255]);
  });
  it("rejects ragged rows and unknown characters", () => {
    expect(() => parseGrid(["aa", "a"], palette)).toThrow(/row 1/);
    expect(() => parseGrid(["z"], palette)).toThrow(/no palette entry/);
  });
});

import { seedSprite } from "@/lib/seedSprite";
describe("seed sprite", () => {
  it("parses with a complete palette and non-trivial coverage", () => {
    const s = seedSprite();
    expect(s.width).toBe(16);
    let opaque = 0;
    for (let i = 3; i < s.rgba.length; i += 4) if (s.rgba[i] === 255) opaque++;
    expect(opaque).toBeGreaterThan(100);
  });
});
