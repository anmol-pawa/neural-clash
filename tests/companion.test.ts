import { describe, expect, it } from "vitest";
import { companionStats } from "../lib/labs/companion";

describe("companionStats", () => {
  it("maps test R squared to power and grade", () => {
    expect(companionStats({ r2: 1 })).toEqual({ power: 100, grade: "Elite" });
    expect(companionStats({ r2: 0.85 })).toEqual({ power: 85, grade: "Sharp" });
    expect(companionStats({ r2: 0.5 })).toEqual({ power: 50, grade: "Trained" });
    expect(companionStats({ r2: 0.2 })).toEqual({ power: 20, grade: "Raw" });
  });
  it("clamps a worse-than-mean or non-finite model to zero", () => {
    expect(companionStats({ r2: -3 }).power).toBe(0);
    expect(companionStats({ r2: Number.NaN }).power).toBe(0);
    expect(companionStats({ r2: 7 }).power).toBe(100);
  });
});
