import { describe, it, expect } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { loadDeck } from "@/lib/cards/loader";
import { CLASSIC_DECK } from "@/lib/cards/samples";
import {
  arraySplitSizes, balancedWeight, bestSplit, binaryEntropy, gini, impurityDecrease, kmeansStep1d, knn1d, logit, naiveBayesPosterior,
  ridge1d, simpleOls, smoothedLikelihood, softThreshold, totalSumSquares,
} from "@/lib/solvers/classical";
import deckJson from "../content/decks/classic-grove.json";

const py = ["python3", "/usr/bin/python3"].find((b) => spawnSync(b, ["-I", "-c", "import numpy"]).status === 0) ?? "python3";
const byId = new Map(CLASSIC_DECK.cards.map((c) => [c.id, c]));
const derive = (id: string) => { const c = byId.get(id); if (!c || c.kind !== "derive") throw new Error(`missing derive ${id}`); return c.answers; };
const predict = (id: string) => { const c = byId.get(id); if (!c || c.kind !== "mcq") throw new Error(`missing mcq ${id}`); return c.choices[c.answer]; };

describe("solvers", () => {
  it("impurity and splits", () => {
    expect(gini([0, 0, 0])).toBe(0);
    expect(gini([0, 1])).toBeCloseTo(0.5, 12);
    expect(binaryEntropy([0, 1])).toBeCloseTo(1, 12);
    expect(binaryEntropy([1, 1])).toBe(0);
    expect(bestSplit([1, 2, 3, 4, 5, 6, 7, 8], [0, 0, 0, 1, 1, 1, 1, 1])).toEqual({ threshold: 3.5, impurity: 0 });
    expect(impurityDecrease([0, 0, 0, 0, 1], [1, 1, 1, 1, 0])).toBeCloseTo(0.18, 12);
  });
  it("regression and shrinkage", () => {
    const r = simpleOls([1, 2, 3, 4, 5], [2.1, 3.9, 6.2, 7.8, 10.1]);
    expect(r.slope).toBeCloseTo(1.99, 9);
    expect(r.intercept).toBeCloseTo(0.05, 9);
    expect(ridge1d([1, 2, 3], [2, 4, 6], 0)).toBe(2);
    expect(ridge1d([1, 2, 3], [2, 4, 6], 14)).toBe(1);
    expect(softThreshold([3, 0.4, 0.2, -2], 0.5)).toEqual([2.5, 0, 0, -1.5]);
  });
  it("neighbours, clusters, counting", () => {
    expect(knn1d([0, 1, 2, 3, 10], [0, 0, 1, 1, 1], 1.4, 3)).toEqual({ labels: [0, 1, 0], vote: 0 });
    const s = kmeansStep1d([1, 2, 9, 10, 11], [0, 5]);
    expect(s.assign).toEqual([0, 0, 1, 1, 1]);
    expect(s.centres).toEqual([1.5, 10]);
    expect(arraySplitSizes(10, 3)).toEqual([4, 3, 3]);
    expect(smoothedLikelihood(0, 10, 5)).toBeCloseTo(1 / 15, 12);
    expect(balancedWeight(100, 2, 10)).toBe(5);
  });
});

describe("Classic Grove deck", () => {
  it("loads cleanly: 35+ unique cards over four topics and every card kind", () => {
    expect(CLASSIC_DECK.errors).toEqual([]);
    expect(CLASSIC_DECK.cards.length).toBeGreaterThanOrEqual(35);
    expect(new Set(CLASSIC_DECK.cards.map((c) => c.id)).size).toBe(CLASSIC_DECK.cards.length);
    expect(new Set(CLASSIC_DECK.cards.map((c) => c.topic)).size).toBe(4);
    expect(new Set(CLASSIC_DECK.cards.map((c) => c.kind))).toEqual(new Set(["mcq", "shape", "derive", "multi", "bug"]));
    expect(loadDeck(deckJson).errors).toEqual([]);
  });

  it("every predict answer is the real stdout of its snippet, with one matching choice", () => {
    const predicts = CLASSIC_DECK.cards.filter((c) => c.kind === "mcq" && c.variant === "predict");
    expect(predicts.length).toBeGreaterThanOrEqual(12);
    for (const c of predicts) {
      if (c.kind !== "mcq" || !c.code) throw new Error("unreachable");
      const out = execFileSync(py, ["-I", "-c", `import numpy as np\nimport math\n${c.code.join("\n")}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
      expect(c.choices[c.answer], c.id).toBe(out);
      expect(c.choices.filter((x) => x === out), c.id).toHaveLength(1);
    }
  }, 60_000);

  it("answers match the independent TypeScript solvers", () => {
    expect(Number(predict("grove-logit"))).toBeCloseTo(logit(0.8), 4);
    expect(Number(predict("grove-gini"))).toBeCloseTo(gini([0, 0, 0, 1, 1, 1, 1, 1]), 4);
    expect(Number(predict("grove-info-gain"))).toBeCloseTo(binaryEntropy([0, 0, 0, 1, 1, 1, 1, 1]) - 0.5 * binaryEntropy([0, 0, 0, 1]), 3);
    expect(predict("grove-ridge-shrink")).toBe(`${ridge1d([1, 2, 3], [2, 4, 6], 0).toFixed(1)} ${ridge1d([1, 2, 3], [2, 4, 6], 14).toFixed(1)}`);
    expect(predict("grove-soft-threshold")).toBe(`[${softThreshold([3, 0.4, 0.2, -2], 0.5).map((v) => v.toFixed(1)).join(", ")}]`);
    expect(predict("grove-knn-vote")).toBe("[0, 1, 0] 0");
    expect(predict("grove-kfold-sizes")).toBe(`[${arraySplitSizes(10, 3).join(", ")}]`);
    expect(Number(predict("grove-nb-smoothing").split(" ")[1])).toBeCloseTo(smoothedLikelihood(0, 10, 5), 4);
    const [, w2] = predict("grove-class-weight").split(" ").map(Number);
    expect(w2).toBe(balancedWeight(100, 2, 10));
    const km = kmeansStep1d([1, 2, 9, 10, 11], [0, 5]);
    expect(predict("grove-kmeans-step")).toBe(`[${km.assign.join(", ")}] [${km.centres.map((c) => c.toFixed(1)).join(", ")}]`);

    const o = simpleOls([1, 2, 3, 4, 5], [2.1, 3.9, 6.2, 7.8, 10.1]);
    expect(derive("grove-derive-ols")).toEqual([expect.closeTo(o.intercept, 5), expect.closeTo(o.slope, 5), expect.closeTo(o.r2, 5)]);
    const l = [0, 0, 0, 0, 1], r = [1, 1, 1, 1, 0];
    expect(derive("grove-derive-gini")).toEqual([expect.closeTo(gini([...l, ...r]), 6), expect.closeTo(gini(l), 6), expect.closeTo(impurityDecrease(l, r), 6)]);
    const xs = [1, 2, 9, 10, 11];
    const two = kmeansStep1d(xs, [1.5, 10]).inertia, one = totalSumSquares(xs);
    expect(derive("grove-derive-inertia")).toEqual([expect.closeTo(two, 5), expect.closeTo(one, 5), expect.closeTo(1 - two / one, 5)]);
    expect(derive("grove-derive-imbalance")).toEqual([0.99, 50, expect.closeTo(balancedWeight(1000, 2, 990), 5)]);
    expect(derive("grove-derive-nb")).toEqual([expect.closeTo(naiveBayesPosterior(0.3, [0.4], [0.05]), 5), expect.closeTo(naiveBayesPosterior(0.3, [0.4, 0.2], [0.05, 0.1]), 5)]);
  });

  it("shape answers", () => {
    const shape = (id: string) => { const c = byId.get(id); if (!c || c.kind !== "shape") throw new Error(id); return c.answer; };
    expect(shape("grove-shape-design")).toEqual([100, 4]);
    expect(shape("grove-shape-gram")).toEqual([4, 4]);
    expect(shape("grove-shape-knn-dist")).toEqual([5, 8]);
    expect(shape("grove-shape-kmeans-assign")).toEqual([200]);
  });

  it("the generated JSON is not stale and mcq answers use all four slots", () => {
    const r = spawnSync("node", ["scripts/gen-classic.mjs", "--check"], { encoding: "utf8" });
    expect(r.stderr).toBe("");
    expect(r.status).toBe(0);
    expect(new Set(CLASSIC_DECK.cards.filter((c) => c.kind === "mcq").map((c) => (c as { answer: number }).answer)).size).toBe(4);
  }, 60_000);
});
