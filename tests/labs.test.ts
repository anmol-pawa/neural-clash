import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LABS, labBrief, labById, labTask, labsByPhase } from "../lib/labs/catalog";

describe("lab catalog", () => {
  it("bundles every content/labs package and is not stale", () => {
    const dirs = readdirSync("content/labs");
    expect(LABS.map((l) => l.id).sort()).toEqual([...dirs].sort());
    expect(() => execFileSync("node", ["scripts/gen-labs.mjs", "--check"], { stdio: "pipe" })).not.toThrow();
  });
  it("masks hidden tests by name and never ships reference solutions", () => {
    for (const l of LABS) {
      expect(l.hiddenTests).not.toMatch(/^def test_(?!hidden_)/m);
      expect(l.hiddenTests).toMatch(/^def test_hidden_/m);
      expect(l.visibleTests).not.toMatch(/def test_hidden_/);
      expect(l.spec).toContain("NotImplementedError");
    }
  });
  it("builds python tasks with a brief and groups by phase", () => {
    const t = labTask(labById("linear-gd")!);
    expect(t.kind).toBe("python");
    expect(t.starter["main.py"]).toContain("def gd_step");
    expect(labBrief(labById("linear-gd")!)).toContain("simplest creature");
    expect(labsByPhase().map((g) => g.phase)).toEqual(["python-port", "vector-vale", "forge", "peaks", "grove"]);
    expect(new Set(LABS.map((l) => l.id)).size).toBe(LABS.length);
  });
});

describe("lab hint ladders", () => {
  it("linear-gd ships a three-rung ladder and every lab has a hints array", () => {
    expect(labById("linear-gd")!.hints).toHaveLength(3);
    for (const l of LABS) expect(Array.isArray(l.hints)).toBe(true);
  });
});
