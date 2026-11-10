import { describe, it, expect } from "vitest";
import { spawnSync, execFileSync } from "node:child_process";
import { loadDeck } from "@/lib/cards/loader";
import { CLASSIC_DECK } from "@/lib/cards/samples";
import {
  balancedWeight, bestThreshold, ensembleVariance, entropyBits, gini, impurityGain, kmeans1d, logisticPoint, naiveBayesPosterior,
  olsLine, ridgeSlope, svmMargin,
} from "@/lib/solvers/classic";
import { sigmoid } from "@/lib/solvers/math";
import deckJson from "../content/decks/classic.json";

const py = ["python3", "/usr/bin/python3"].find((b) => spawnSync(b, ["-I", "-c", "import numpy"]).status === 0) ?? "python3";
const byId = new Map(CLASSIC_DECK.cards.map((c) => [c.id, c]));
const derive = (id: string) => { const c = byId.get(id); if (!c || c.kind !== "derive") throw new Error(`missing derive ${id}`); return c.answers; };
const predict = (id: string) => { const c = byId.get(id); if (!c || c.kind !== "mcq") throw new Error(`missing mcq ${id}`); return c.choices[c.answer]; };

describe("Classic Grove deck", () => {
  it("loads cleanly: 38+ unique cards over four topics and all card kinds", () => {
    expect(CLASSIC_DECK.errors).toEqual([]);
    expect(CLASSIC_DECK.cards.length).toBeGreaterThanOrEqual(38);
    expect(new Set(CLASSIC_DECK.cards.map((c) => c.id)).size).toBe(CLASSIC_DECK.cards.length);
    expect(new Set(CLASSIC_DECK.cards.map((c) => c.topic)).size).toBe(4);
    expect(new Set(CLASSIC_DECK.cards.map((c) => c.kind))).toEqual(new Set(["mcq", "shape", "derive", "multi", "bug"]));
    expect(loadDeck(deckJson).errors).toEqual([]);
  });

  it("every predict answer is the real stdout of its snippet", () => {
    const predicts = CLASSIC_DECK.cards.filter((c) => c.kind === "mcq" && c.variant === "predict");
    expect(predicts.length).toBeGreaterThanOrEqual(18);
    for (const c of predicts) {
      if (c.kind !== "mcq" || !c.code) throw new Error("unreachable");
      const out = execFileSync(py, ["-I", "-c", `import numpy as np\nimport math\n${c.code.join("\n")}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
      expect(c.choices[c.answer], c.id).toBe(out);
      expect(c.choices.filter((x) => x === out), c.id).toHaveLength(1);
    }
  }, 60_000);

  it("shape answers follow numpy broadcasting rules", () => {
    const shape = (id: string) => { const c = byId.get(id); if (!c || c.kind !== "shape") throw new Error(id); return c.answer; };
    expect(shape("cls-shape-design")).toEqual([100, 4]);
    expect(shape("cls-shape-gram")).toEqual([3, 3]);
    expect(shape("cls-shape-dist")).toEqual([5, 3]);
    expect(shape("cls-shape-residual")).toEqual([100, 100]);
  });

  it("predict and derive answers match independent TypeScript solvers", () => {
    expect(Number(predict("cls-sigmoid"))).toBeCloseTo(sigmoid(2), 4);
    expect(Number(predict("cls-gini"))).toBeCloseTo(gini([3, 1]), 4);
    expect(Number(predict("cls-info-gain"))).toBeCloseTo(impurityGain(entropyBits, [3, 5], [[3, 1], [0, 4]]), 4);
    expect(Number(predict("cls-bagging-corr"))).toBeCloseTo(ensembleVariance(4, 25, 0.5), 3);
    expect(Number(predict("cls-naive-bayes"))).toBeCloseTo(naiveBayesPosterior(0.5, [0.4, 0.4], [0.1, 0.1]), 4);
    expect(Number(predict("cls-svm-margin"))).toBeCloseTo(svmMargin([3, 4]), 12);
    expect(Number(predict("cls-ridge-shrink"))).toBeCloseTo(ridgeSlope([1, 2, 3], [2, 4, 6], 14), 3);
    const [wp, wn] = predict("cls-class-weight").split(" ").map(Number);
    expect(wp).toBe(balancedWeight(1000, 2, 10));
    expect(wn).toBeCloseTo(balancedWeight(1000, 2, 990), 3);

    const ols = olsLine([0, 1, 2, 3], [1, 3, 4, 8]);
    expect(derive("cls-derive-ols")).toEqual([expect.closeTo(ols.a, 6), expect.closeTo(ols.b, 6), expect.closeTo(ols.sse, 6)]);
    expect(ols.b).toBeCloseTo(2.2, 12);
    const x = [1, 2, 3], y = [2, 4, 7];
    expect(derive("cls-derive-ridge")).toEqual([0, 1, 14].map((l) => expect.closeTo(ridgeSlope(x, y, l), 5)));
    const lp = logisticPoint([0.5, -1], 0.2, [2, 1], 1);
    expect(derive("cls-derive-logistic")).toEqual([expect.closeTo(lp.logit, 6), expect.closeTo(lp.p, 6), expect.closeTo(lp.loss, 6)]);
    const parent = gini([6, 2]);
    const gain = impurityGain(gini, [6, 2], [[4, 0], [2, 2]]);
    expect(derive("cls-derive-gini-gain")).toEqual([expect.closeTo(parent, 6), expect.closeTo(parent - gain, 6), expect.closeTo(gain, 6)]);
    const km = kmeans1d([[1, 2, 4], [11, 12]]);
    expect(derive("cls-derive-kmeans")).toEqual([expect.closeTo(km.centroids[0], 6), expect.closeTo(km.centroids[1], 6), expect.closeTo(km.inertia, 6)]);
  });

  it("the best split on the lesson data is threshold 3", () => {
    expect(bestThreshold([1, 2, 3, 4, 5, 6, 7, 8], [0, 0, 0, 1, 1, 0, 1, 1]).threshold).toBe(3);
    expect(bestThreshold([1, 2, 3, 4, 5, 6, 7, 8], [0, 0, 0, 1, 1, 0, 1, 1]).score).toBeCloseTo(0.2, 12);
  });

  it("the generated JSON is not stale and mcq answers are spread over all four slots", () => {
    const r = spawnSync("node", ["scripts/gen-classic.mjs", "--check"], { encoding: "utf8" });
    expect(r.stderr).toBe("");
    expect(r.status).toBe(0);
    const idx = CLASSIC_DECK.cards.filter((c) => c.kind === "mcq").map((c) => (c as { answer: number }).answer);
    expect(new Set(idx).size).toBe(4);
  }, 60_000);
});
