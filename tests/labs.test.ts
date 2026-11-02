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
    expect(labsByPhase().map((g) => g.phase)).toEqual(["python-port", "forge"]);
    expect(new Set(LABS.map((l) => l.id)).size).toBe(LABS.length);
  });
});

import { BASE_STATS, companionStats } from "../lib/labs/companion";

describe("hints and companion stats", () => {
  it("linear-gd ships a three-rung hint ladder that does not leak the answer", () => {
    const l = labById("linear-gd")!;
    expect(l.hints).toHaveLength(3);
    expect(l.functions).toEqual(["mse_loss_grad", "gd_step", "fit", "r2_score"]);
  });
  it("stats start at base and reward unassisted solves more than assisted ones", () => {
    expect(companionStats({})).toEqual(BASE_STATS);
    const clean = companionStats({ "linear-gd": { passed: true, assisted: false } });
    const helped = companionStats({ "linear-gd": { passed: true, assisted: true } });
    expect(clean.power).toBe(BASE_STATS.power + 10);
    expect(helped.power).toBe(BASE_STATS.power + 5);
    expect(companionStats({ "linear-gd": { passed: false, assisted: false } }).power).toBe(BASE_STATS.power);
  });
  it("speed is capped and only np-* labs feed it", () => {
    const labs = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`np-${i}`, { passed: true, assisted: false }]));
    expect(companionStats(labs).speed).toBe(BASE_STATS.speed + 16);
    expect(companionStats({ "py-two-sum": { passed: true, assisted: false } }).speed).toBe(BASE_STATS.speed);
  });
});
