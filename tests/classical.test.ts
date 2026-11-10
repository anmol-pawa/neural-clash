import { describe, it, expect } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { loadDeck } from "@/lib/cards/loader";
import { CLASSICAL_DECK } from "@/lib/cards/samples";
import {
  balancedWeights, biasVariance, bestThreshold, ensembleVariance, gini, hyperplaneDistance, inertia, labelEntropy, logisticGradient,
  naiveBayesPosterior, ridge1d, simpleOls, splitGain, weightedImpurity,
} from "@/lib/solvers/classical";
import deckJson from "../content/decks/classical.json";

const py = ["python3", "/usr/bin/python3"].find((b) => spawnSync(b, ["-I", "-c", "import numpy"]).status === 0) ?? "python3";
const byId = new Map(CLASSICAL_DECK.cards.map((c) => [c.id, c]));
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

describe("Classic Grove deck", () => {
  it("loads cleanly: 45+ unique cards across four topics and every card kind used", () => {
    expect(CLASSICAL_DECK.errors).toEqual([]);
    expect(CLASSICAL_DECK.cards.length).toBeGreaterThanOrEqual(45);
    expect(new Set(CLASSICAL_DECK.cards.map((c) => c.id)).size).toBe(CLASSICAL_DECK.cards.length);
    expect(new Set(CLASSICAL_DECK.cards.map((c) => c.topic)).size).toBe(4);
    expect(new Set(CLASSICAL_DECK.cards.map((c) => c.kind))).toEqual(new Set(["mcq", "shape", "derive", "multi", "bug"]));
    expect(loadDeck(deckJson).errors).toEqual([]);
  });

  it("every predict answer is the real stdout of its snippet under numpy, with one matching choice", () => {
    const predicts = CLASSICAL_DECK.cards.filter((c) => c.kind === "mcq" && c.variant === "predict");
    expect(predicts.length).toBeGreaterThanOrEqual(15);
    for (const c of predicts) {
      if (c.kind !== "mcq" || !c.code) throw new Error("unreachable");
      const out = execFileSync(py, ["-I", "-c", `import numpy as np\nimport math\n${c.code.join("\n")}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
      expect(c.choices[c.answer], c.id).toBe(out);
      expect(c.choices.filter((x) => x === out), c.id).toHaveLength(1);
    }
  }, 60_000);

  it("shape answers match the conventions they teach", () => {
    const shape = (id: string) => { const c = byId.get(id); if (!c || c.kind !== "shape") throw new Error(id); return c.answer; };
    expect(shape("ml-shape-gram")).toEqual([3, 3]);
    expect(shape("ml-shape-column-trap")).toEqual([100, 100]);
    expect(shape("ml-shape-kmeans-diff")).toEqual([50, 4, 2]);
    expect(shape("ml-shape-softmax-grad")).toEqual([10, 3]);
  });

  it("predict answers match independent TypeScript solvers", () => {
    const X = [[1, 0], [1, 1], [1, 2], [1, 3]];
    expect(ridge1d([1, 2, 3], [2, 4, 6], 14)).toBeCloseTo(Number(predict("ml-ridge-shrinks")), 6);
    expect(JSON.parse(predict("ml-logistic-grad"))).toEqual(logisticGradient([[1, 2], [1, -1]], [1, 0], [0, 0]).map((v) => (v === 0 ? 0 : v)));
    expect(Number(predict("ml-gini"))).toBeCloseTo(gini([0, 0, 1, 1, 1, 1]), 4);
    expect(Number(predict("ml-info-gain"))).toBeCloseTo(splitGain([[0, 0, 0, 1], [0, 1, 1, 1]], labelEntropy), 4);
    expect(Number(predict("ml-bagging-variance"))).toBeCloseTo(ensembleVariance(0.5, 4, 100), 3);
    expect(Number(predict("ml-naive-bayes"))).toBeCloseTo(naiveBayesPosterior(0.4, [0.5, 0.2], [0.1, 0.05]), 4);
    expect(Number(predict("ml-svm-margin"))).toBeCloseTo(hyperplaneDistance([3, 4], -5, [3, 4]), 3);
    expect(JSON.parse(predict("ml-class-weights"))).toEqual(balancedWeights([990, 10]).map((v) => Math.round(v * 1e4) / 1e4));
    expect(X.length).toBe(4);
  });

  it("derive answers match independent TypeScript solvers", () => {
    const ols = simpleOls([1, 2, 3, 4, 5], [2.1, 3.9, 6.2, 7.8, 10.1]);
    expect(derive("ml-derive-ols")).toEqual([expect.closeTo(ols.slope, 5), expect.closeTo(ols.intercept, 5), expect.closeTo(ols.r2, 5)]);
    expect(derive("ml-derive-ridge")).toEqual([0, 1, 10].map((l) => expect.closeTo(ridge1d([1, 2, 3], [2, 4, 7], l), 5)));
    const left = [0, 0, 0, 1];
    const right = [1, 1, 1, 1, 1, 1];
    expect(derive("ml-derive-gini-split")).toEqual([expect.closeTo(gini([...left, ...right]), 6), expect.closeTo(weightedImpurity([left, right], gini), 6), expect.closeTo(splitGain([left, right], gini), 6)]);
    const pts = [[0, 0], [0, 2], [8, 0], [8, 2]];
    expect(derive("ml-derive-inertia")).toEqual([inertia(pts, [[0, 1, 2, 3]]), inertia(pts, [[0, 1], [2, 3]])]);
    const g = logisticGradient([[1, 0], [1, 1], [1, 2], [1, 3]], [0, 0, 1, 1], [0, 0]);
    expect(derive("ml-derive-logistic-step")).toEqual([expect.closeTo(g[0], 6), expect.closeTo(g[1], 6), expect.closeTo(-g[1], 6)]);
    const bv = biasVariance([3, 5, 7, 9], 4, 1);
    expect(derive("ml-derive-bias-variance")).toEqual([bv.bias2, bv.variance, bv.expectedMse]);
  });

  it("the generated JSON is not stale and mcq answers are spread over all four slots", () => {
    const r = spawnSync("node", ["scripts/gen-classical.mjs", "--check"], { encoding: "utf8" });
    expect(r.stderr).toBe("");
    expect(r.status).toBe(0);
    const idx = CLASSICAL_DECK.cards.filter((c) => c.kind === "mcq").map((c) => (c as { answer: number }).answer);
    expect(new Set(idx).size).toBe(4);
  }, 60_000);
});

describe("classical solvers", () => {
  it("impurity: pure is 0, 50/50 is 0.5 (Gini) and 1 bit (entropy)", () => {
    expect(gini([1, 1, 1])).toBe(0);
    expect(gini([0, 1])).toBeCloseTo(0.5, 12);
    expect(labelEntropy([0, 1])).toBeCloseTo(1, 12);
    expect(splitGain([[0, 0], [1, 1]], gini)).toBeCloseTo(0.5, 12);
  });
  it("finds the threshold that separates a clean split and reports the impurity decrease", () => {
    const r = bestThreshold([1, 2, 3, 4, 5, 6, 7, 8], [0, 0, 0, 1, 1, 1, 1, 0]);
    expect(r.threshold).toBe(3.5);
    expect(r.score).toBeCloseTo(0.2, 9);
    expect(bestThreshold([1, 2, 3, 4], [0, 0, 1, 1]).score).toBe(0);
  });
  it("ridge shrinks monotonically toward zero", () => {
    const w = [0, 1, 10, 1000].map((l) => ridge1d([1, 2, 3], [2, 4, 7], l));
    expect(w[0]).toBeCloseTo(31 / 14, 12);
    for (let i = 1; i < w.length; i++) expect(w[i]).toBeLessThan(w[i - 1]);
    expect(w[3]).toBeGreaterThan(0);
  });
  it("logistic gradient matches a central finite difference of the loss", () => {
    const X = [[1, 0.5], [1, -1.2], [1, 2]];
    const y = [1, 0, 1];
    const loss = (w: number[]) => -X.reduce((s, r, i) => { const p = 1 / (1 + Math.exp(-(r[0] * w[0] + r[1] * w[1]))); return s + y[i] * Math.log(p) + (1 - y[i]) * Math.log(1 - p); }, 0) / X.length;
    const w = [0.3, -0.4];
    const g = logisticGradient(X, y, w);
    for (let j = 0; j < 2; j++) {
      const e = 1e-6;
      const hi = [...w]; hi[j] += e;
      const lo = [...w]; lo[j] -= e;
      expect(g[j]).toBeCloseTo((loss(hi) - loss(lo)) / (2 * e), 6);
    }
  });
  it("ensemble variance floors at rho sigma^2 and equals sigma^2 for one predictor", () => {
    expect(ensembleVariance(0.3, 2, 1)).toBeCloseTo(2, 12);
    expect(ensembleVariance(0.3, 2, 1e9)).toBeCloseTo(0.6, 6);
  });
});
