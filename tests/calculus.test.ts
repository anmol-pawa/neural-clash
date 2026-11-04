import { describe, it, expect } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { loadDeck } from "@/lib/cards/loader";
import { CALCULUS_DECK } from "@/lib/cards/samples";
import { matmul } from "@/lib/solvers/shapes";
import { adamStep, centralDiff, clipByNorm, gdQuadratic, maxStableLr } from "@/lib/solvers/calculus";
import { sigmoid, softmaxCEGrad } from "@/lib/solvers/math";
import deckJson from "../content/decks/calculus.json";

const py = ["python3", "/usr/bin/python3"].find((b) => spawnSync(b, ["-I", "-c", "import numpy"]).status === 0) ?? "python3";
const byId = new Map(CALCULUS_DECK.cards.map((c) => [c.id, c]));
const derive = (id: string) => {
  const c = byId.get(id);
  if (!c || c.kind !== "derive") throw new Error(`missing derive card ${id}`);
  return c.answers;
};
const predict = (id: string) => {
  const c = byId.get(id);
  if (!c || c.kind !== "mcq") throw new Error(`missing mcq ${id}`);
  return c.choices[c.answer];
};

describe("Gradient Gorge deck", () => {
  it("loads cleanly: 35+ unique cards across four topics and every card kind used", () => {
    expect(CALCULUS_DECK.errors).toEqual([]);
    expect(CALCULUS_DECK.cards.length).toBeGreaterThanOrEqual(35);
    expect(new Set(CALCULUS_DECK.cards.map((c) => c.id)).size).toBe(CALCULUS_DECK.cards.length);
    expect(new Set(CALCULUS_DECK.cards.map((c) => c.topic)).size).toBe(4);
    expect(new Set(CALCULUS_DECK.cards.map((c) => c.kind))).toEqual(new Set(["mcq", "shape", "derive", "multi", "bug"]));
    expect(loadDeck(deckJson).errors).toEqual([]);
  });

  it("every predict answer is the real stdout of its snippet under numpy, with one matching choice", () => {
    const predicts = CALCULUS_DECK.cards.filter((c) => c.kind === "mcq" && c.variant === "predict");
    expect(predicts.length).toBeGreaterThanOrEqual(12);
    for (const c of predicts) {
      if (c.kind !== "mcq" || !c.code) throw new Error("unreachable");
      const out = execFileSync(py, ["-I", "-c", `import numpy as np\n${c.code.join("\n")}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
      expect(c.choices[c.answer], c.id).toBe(out);
      expect(c.choices.filter((x) => x === out), c.id).toHaveLength(1);
    }
  }, 60_000);

  it("shape answers agree with the TypeScript shape solvers", () => {
    const shape = (id: string) => { const c = byId.get(id); if (!c || c.kind !== "shape") throw new Error(id); return c.answer; };
    const ok = (r: ReturnType<typeof matmul>) => (r.ok ? r.shape : null);
    expect(shape("cal-shape-dW")).toEqual(ok(matmul([10, 32], [32, 4])));
    expect(shape("cal-shape-dX")).toEqual(ok(matmul([32, 4], [4, 10])));
    expect(shape("cal-shape-grad-fail")).toEqual(ok(matmul([32, 10], [32, 4])));
    expect(shape("cal-shape-jac")).toEqual(ok(matmul([3], [3, 5])));
    expect(shape("cal-shape-db")).toEqual([4]);
  });

  it("predict and derive answers match independent TypeScript solvers", () => {
    expect(Number(predict("cal-central-diff"))).toBeCloseTo(centralDiff((x) => x * x, 3), 3);
    expect(Number(predict("cal-sigmoid-slope"))).toBeCloseTo(sigmoid(0) * (1 - sigmoid(0)), 12);
    expect(JSON.parse(predict("cal-softmax-ce-grad"))).toEqual(softmaxCEGrad([2, 1, 0], 0).map((x) => expect.closeTo(x, 4)));
    expect(JSON.parse(predict("cal-clip"))).toEqual(clipByNorm([3, 4], 1).map((x) => expect.closeTo(x, 4)));
    expect(Number(predict("cal-gd-diverge"))).toBeCloseTo(gdQuadratic(1, 1.1, 2, 3).at(-1)!, 4);
    expect(Number(predict("cal-momentum"))).toBeCloseTo(gdQuadratic(1, 0.1, 2, 2, 0.9).at(-1)!, 4);
    const a1 = adamStep(250, { m: 0, v: 0, t: 0 });
    expect(Number(predict("cal-adam-first-step"))).toBeCloseTo(a1.delta, 4);

    expect(derive("cal-derive-poly")).toEqual([expect.closeTo(centralDiff((x) => x ** 3 - 2 * x, 2), 3), 12, 1.5]);
    const a = sigmoid(2 * 3 - 5);
    const dz = (a - 1) * a * (1 - a);
    expect(derive("cal-derive-chain")).toEqual([expect.closeTo(a, 5), expect.closeTo(dz, 5), expect.closeTo(dz * 3, 5)]);
    expect(derive("cal-derive-stable-lr")).toEqual([maxStableLr(10), 10, expect.closeTo(0.85, 9), expect.closeTo(-0.5, 9)]);
    const traj = gdQuadratic(1, 0.1, 2, 100);
    expect(derive("cal-derive-steps")[0]).toBeCloseTo(0.8, 9);
    expect(traj.findIndex((w) => Math.abs(w) < 1e-3)).toBe(derive("cal-derive-steps")[1]);
    const s1 = adamStep(4, { m: 0, v: 0, t: 0 });
    const s2 = adamStep(2, s1.state, 0.1);
    expect(derive("cal-derive-adam")).toEqual([expect.closeTo(s2.mHat, 5), expect.closeTo(s2.vHat, 5), expect.closeTo(s2.delta, 5)]);
  });

  it("the generated JSON is not stale and mcq answers are spread over all four slots", () => {
    const r = spawnSync("node", ["scripts/gen-calculus.mjs", "--check"], { encoding: "utf8" });
    expect(r.stderr).toBe("");
    expect(r.status).toBe(0);
    const idx = CALCULUS_DECK.cards.filter((c) => c.kind === "mcq").map((c) => (c as { answer: number }).answer);
    expect(new Set(idx).size).toBe(4);
  }, 60_000);
});

describe("calculus solvers", () => {
  it("gradient-descent stability follows lr < 2 / curvature", () => {
    expect(Math.abs(gdQuadratic(1, 0.19, 10, 50).at(-1)!)).toBeLessThan(1e-2);
    expect(Math.abs(gdQuadratic(1, 0.21, 10, 50).at(-1)!)).toBeGreaterThan(1);
  });
  it("Adam's first step is lr regardless of gradient scale", () => {
    for (const g of [0.01, 1, 250]) expect(adamStep(g, { m: 0, v: 0, t: 0 }).delta).toBeCloseTo(0.001, 6);
  });
});
