import { describe, it, expect } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { loadDeck } from "@/lib/cards/loader";
import { CLASSICAL_DECK } from "@/lib/cards/samples";
import {
  averagedVariance, balancedWeights, bestSplit, gini, kmeansStep, knnIndices, labelEntropy, logisticLossGrad, naiveBayesPosterior,
  prf1, r2Score, ridgeFit, solveLinear, splitGain,
} from "@/lib/solvers/classical";
import { sigmoid } from "@/lib/solvers/math";
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
    expect(new Set(CLASSICAL_DECK.cards.map((c) => c.topic))).toEqual(new Set(["cls-linear", "cls-simple", "cls-trees", "cls-practice"]));
    expect(new Set(CLASSICAL_DECK.cards.map((c) => c.kind))).toEqual(new Set(["mcq", "shape", "derive", "multi", "bug"]));
    expect(loadDeck(deckJson).errors).toEqual([]);
  });

  it("every predict answer is the real stdout of its snippet under numpy, with one matching choice", () => {
    const predicts = CLASSICAL_DECK.cards.filter((c) => c.kind === "mcq" && c.variant === "predict");
    expect(predicts.length).toBeGreaterThanOrEqual(20);
    for (const c of predicts) {
      if (c.kind !== "mcq" || !c.code) throw new Error("unreachable");
      const out = execFileSync(py, ["-I", "-c", `import numpy as np\nimport math\n${c.code.join("\n")}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
      expect(c.choices[c.answer], c.id).toBe(out);
      expect(c.choices.filter((x) => x === out), c.id).toHaveLength(1);
    }
  }, 60_000);

  it("shape answers match the numpy conventions they teach", () => {
    const shape = (id: string) => { const c = byId.get(id); if (!c || c.kind !== "shape") throw new Error(id); return c.answer; };
    expect(shape("cls-shape-gram")).toEqual([3, 3]);
    expect(shape("cls-shape-pairwise")).toEqual([5, 3]);
    expect(shape("cls-shape-column")).toEqual([100, 1]);
    expect(shape("cls-shape-column-bug")).toEqual([100, 100]);
  });

  it("predict and derive answers match independent TypeScript solvers", () => {
    const X3 = [[1, 1], [1, 2], [1, 3]];
    const w = ridgeFit(X3, [1, 2, 2]);
    expect(predict("cls-normal-eq")).toBe(JSON.stringify(w.map((v) => Math.round(v * 1000) / 1000)).replace(/,/g, ", "));
    expect(Number(predict("cls-r2"))).toBeCloseTo(r2Score([3, 5, 7, 9], [2.5, 5.5, 6.5, 9.5]), 3);
    expect(predict("cls-ridge-shrink")).toBe(`${ridgeFit([[1], [2], [3]], [2, 4, 6], 0)[0].toFixed(1)} ${ridgeFit([[1], [2], [3]], [2, 4, 6], 14)[0].toFixed(1)}`);
    expect(JSON.parse(predict("cls-sigmoid")) as number[]).toEqual([-2, 0, 3].map((z) => Math.round(sigmoid(z) * 1e4) / 1e4));
    const lg = logisticLossGrad([[1, 2], [1, -1]], [1, 0], [0, 0]).grad;
    expect(JSON.parse(predict("cls-logit-grad")) as number[]).toEqual(lg.map((v) => Math.round(v * 1e3) / 1e3 + 0));
    const pts = [[0, 0], [1, 0], [0, 1], [5, 5], [6, 5]];
    expect(predict("cls-knn")).toBe(`[${knnIndices(pts, [2, 1.5], 3).join(", ")}] 0`);
    expect(knnIndices([[1, 50000], [2, 51000], [1.5, 90000]], [1, 51000], 1)).toEqual([Number(predict("cls-knn-scale"))]);
    expect(Number(predict("cls-naive-bayes"))).toBeCloseTo(naiveBayesPosterior([0.5, 0.5], [[0.8, 0.4], [0.1, 0.3]], [1, 0])[0], 4);
    expect(Number(predict("cls-laplace"))).toBeCloseTo(1 / 15, 4);
    expect(Number(predict("cls-gini"))).toBeCloseTo(gini([0, 0, 0, 1, 1, 1, 1, 1]), 4);
    expect(Number(predict("cls-split-gain"))).toBeCloseTo(splitGain([0, 0, 0, 1, 1, 1], [0, 0, 0], [1, 1, 1]).gain, 3);
    expect(Number(predict("cls-bagging-var"))).toBeCloseTo(averagedVariance(0.5, 4, 10), 3);
    expect(predict("cls-kmeans-assign")).toBe(`[${kmeansStep([[0, 0], [0, 2], [10, 0], [10, 2]], [[0, 1], [10, 1]]).labels.join(", ")}] 4.0`);
    const p = prf1(8, 2, 4);
    expect(predict("cls-precision-recall")).toBe(`${p.precision.toFixed(1)} ${p.recall.toFixed(3)} ${p.f1.toFixed(3)}`);
    expect(JSON.parse(predict("cls-class-weight")) as number[]).toEqual(balancedWeights([950, 50]).map((v) => Math.round(v * 1e3) / 1e3));

    const ols = ridgeFit([[1, 1], [1, 2], [1, 3], [1, 4]], [2, 4, 5, 8]);
    const r2 = r2Score([2, 4, 5, 8], [1, 2, 3, 4].map((x) => ols[0] + ols[1] * x));
    expect(derive("cls-derive-ols")).toEqual([expect.closeTo(ols[0], 5), expect.closeTo(ols[1], 5), expect.closeTo(r2, 5)]);
    const lgs = logisticLossGrad([[1, 0.5], [1, -1], [1, 2]], [1, 0, 1], [0, 0]);
    expect(derive("cls-derive-logistic-step")).toEqual([expect.closeTo(lgs.loss, 5), expect.closeTo(lgs.grad[0], 5), expect.closeTo(lgs.grad[1], 5)]);
    const y = [0, 0, 1, 1, 1, 1, 0, 1];
    const sg = splitGain(y, y.slice(0, 3), y.slice(3));
    expect(derive("cls-derive-split")).toEqual([expect.closeTo(gini(y), 5), expect.closeTo(sg.child, 5), expect.closeTo(sg.gain, 5)]);
    const km = kmeansStep([[1], [2], [9], [10], [20]], [[1], [10]]);
    expect(derive("cls-derive-kmeans")).toEqual([expect.closeTo(km.inertia, 5), expect.closeTo(km.centroids[0][0], 5), expect.closeTo(km.centroids[1][0], 5)]);
    const f = prf1(3, 2, 1);
    expect(derive("cls-derive-threshold")).toEqual([expect.closeTo(f.precision, 5), expect.closeTo(f.recall, 5), expect.closeTo(f.f1, 5)]);
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
  it("solveLinear solves a system and rejects a singular one", () => {
    expect(solveLinear([[2, 1], [1, 3]], [3, 5]).map((v) => Math.round(v * 1e9) / 1e9)).toEqual([0.8, 1.4]);
    expect(() => solveLinear([[1, 2], [2, 4]], [1, 2])).toThrow(/singular/);
  });
  it("ridge shrinks weights monotonically and R^2 of the mean predictor is zero", () => {
    const X = [[1, 1], [1, 2], [1, 3], [1, 4]];
    const y = [2, 4, 5, 8];
    const norms = [0, 1, 10, 100].map((l) => Math.hypot(...ridgeFit(X.map((r) => [r[1]]), y, l)));
    for (let i = 1; i < norms.length; i++) expect(norms[i]).toBeLessThan(norms[i - 1]);
    expect(r2Score(y, y.map(() => 4.75))).toBeCloseTo(0, 12);
  });
  it("logistic gradient matches a finite-difference check of the loss", () => {
    const X = [[1, 0.5], [1, -1], [1, 2], [1, -2]];
    const y = [1, 0, 1, 1];
    const w = [0.3, -0.2];
    const { grad } = logisticLossGrad(X, y, w);
    for (let j = 0; j < 2; j++) {
      const h = 1e-6;
      const wp = [...w]; wp[j] += h;
      const wm = [...w]; wm[j] -= h;
      expect(grad[j]).toBeCloseTo((logisticLossGrad(X, y, wp).loss - logisticLossGrad(X, y, wm).loss) / (2 * h), 6);
    }
  });
  it("impurity: pure is zero, uniform is maximal, bestSplit finds the clean cut and weights matter", () => {
    expect(gini([1, 1, 1])).toBe(0);
    expect(gini([0, 1])).toBeCloseTo(0.5, 12);
    expect(labelEntropy([0, 1])).toBeCloseTo(1, 12);
    const s = bestSplit([1, 2, 3, 10, 11, 12], [0, 0, 0, 1, 1, 1]);
    expect(s.threshold).toBeCloseTo(6.5, 12);
    expect(s.gain).toBeCloseTo(0.5, 12);
    // Peeling one pure example off a mostly impure node is a poor split once weighted.
    const parent = [0, 0, 1, 1, 0, 1, 0, 1, 1];
    const rest = parent.slice(1);
    const weighted = splitGain(parent, [0], rest).gain;
    const unweighted = gini(parent) - (gini([0]) + gini(rest)) / 2;
    expect(weighted).toBeLessThan(0.1);
    expect(unweighted).toBeGreaterThan(2 * weighted);
  });
  it("k-means never increases inertia and k-NN breaks ties by index", () => {
    const pts = [[0, 0], [0, 1], [5, 5], [6, 5], [10, 0]];
    let c: number[][] = [[0, 0], [5, 5]];
    let last = Infinity;
    for (let i = 0; i < 5; i++) {
      const s = kmeansStep(pts, c);
      expect(s.inertia).toBeLessThanOrEqual(last + 1e-12);
      last = s.inertia;
      c = s.centroids;
    }
    expect(knnIndices([[0], [2], [2]], [1], 2)).toEqual([0, 1]);
  });
});
