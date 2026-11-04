import { describe, it, expect } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { loadDeck } from "@/lib/cards/loader";
import { PROBABILITY_DECK } from "@/lib/cards/samples";
import {
  bayesPosterior, bernoulliMap, bernoulliMle, binaryLogLoss, crossEntropy, discreteMoments, entropy, erf, familywiseError,
  klDivergence, oddsToProb, pPositive, perplexityOfProbs, sampleSizePerArm, twoProportionZ, twoSidedP, variance, withinSigmas,
} from "@/lib/solvers/probability";
import deckJson from "../content/decks/probability.json";

const py = ["python3", "/usr/bin/python3"].find((b) => spawnSync(b, ["-I", "-c", "import numpy"]).status === 0) ?? "python3";
const byId = new Map(PROBABILITY_DECK.cards.map((c) => [c.id, c]));
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

describe("Probability Peaks deck", () => {
  it("loads cleanly: 35+ unique cards across four topics and every card kind used", () => {
    expect(PROBABILITY_DECK.errors).toEqual([]);
    expect(PROBABILITY_DECK.cards.length).toBeGreaterThanOrEqual(35);
    expect(new Set(PROBABILITY_DECK.cards.map((c) => c.id)).size).toBe(PROBABILITY_DECK.cards.length);
    expect(new Set(PROBABILITY_DECK.cards.map((c) => c.topic)).size).toBe(4);
    expect(new Set(PROBABILITY_DECK.cards.map((c) => c.kind))).toEqual(new Set(["mcq", "shape", "derive", "multi", "bug"]));
    expect(loadDeck(deckJson).errors).toEqual([]);
  });

  it("every predict answer is the real stdout of its snippet under numpy, with one matching choice", () => {
    const predicts = PROBABILITY_DECK.cards.filter((c) => c.kind === "mcq" && c.variant === "predict");
    expect(predicts.length).toBeGreaterThanOrEqual(15);
    for (const c of predicts) {
      if (c.kind !== "mcq" || !c.code) throw new Error("unreachable");
      const out = execFileSync(py, ["-I", "-c", `import numpy as np\nimport math\n${c.code.join("\n")}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
      expect(c.choices[c.answer], c.id).toBe(out);
      expect(c.choices.filter((x) => x === out), c.id).toHaveLength(1);
    }
  }, 60_000);

  it("shape answers match the numpy conventions they teach", () => {
    const shape = (id: string) => { const c = byId.get(id); if (!c || c.kind !== "shape") throw new Error(id); return c.answer; };
    expect(shape("prob-shape-cov")).toEqual([5, 5]);
    expect(shape("prob-shape-cov-wrong")).toEqual([200, 200]);
    expect(shape("prob-shape-marginal")).toEqual([3]);
    expect(shape("prob-shape-mean-keepdims")).toEqual([1, 5]);
  });

  it("predict and derive answers match independent TypeScript solvers", () => {
    expect(Number(predict("prob-base-rate"))).toBeCloseTo(bayesPosterior(0.01, 0.9, 0.05), 4);
    const odds = (0.01 / 0.99) * (0.9 / 0.05);
    expect(Number(predict("prob-odds-update"))).toBeCloseTo(odds, 4);
    expect(oddsToProb(odds)).toBeCloseTo(bayesPosterior(0.01, 0.9, 0.05), 12);
    expect(Number(predict("prob-conditional"))).toBeCloseTo(0.4 / 0.5, 2);
    expect(Number(predict("prob-at-least-one"))).toBeCloseTo(familywiseError(10, 0.1), 4);
    expect(Number(predict("prob-one-sigma"))).toBeCloseTo(withinSigmas(1), 4);
    expect(Number(predict("prob-peeking"))).toBeCloseTo(familywiseError(5), 4);
    expect(Number(predict("prob-multiple-comparisons"))).toBeCloseTo(familywiseError(20), 4);
    expect(Number(predict("prob-standard-error"))).toBeCloseTo(2 / Math.sqrt(100), 3);
    expect(Number(predict("prob-cross-entropy"))).toBeCloseTo(crossEntropy([0.5, 0.5], [0.9, 0.1]), 4);
    expect(entropy([0.5, 0.25, 0.25], 2)).toBeCloseTo(Number(predict("prob-entropy-bits")), 12);
    expect(Number(predict("prob-perplexity"))).toBeCloseTo(perplexityOfProbs([0.5, 0.25, 0.125, 0.125]), 4);
    expect(Number(predict("prob-two-proportion-z"))).toBeCloseTo(twoProportionZ(200, 2000, 240, 2000), 3);
    const [a, b] = predict("prob-kl-asymmetry").split(" ").map(Number);
    expect(a).toBeCloseTo(klDivergence([0.5, 0.5], [0.9, 0.1]), 3);
    expect(b).toBeCloseTo(klDivergence([0.9, 0.1], [0.5, 0.5]), 3);
    expect(a).not.toBeCloseTo(b, 2);
    const [v0, v1] = predict("prob-variance-ddof").split(" ").map(Number);
    const x = [2, 4, 4, 4, 5, 5, 7, 9];
    expect(v0).toBeCloseTo(variance(x), 12);
    expect(v1).toBeCloseTo(variance(x, 1), 3);
    const [mle, map] = predict("prob-mle-map").split(" ").map(Number);
    expect(mle).toBeCloseTo(bernoulliMle(6, 8), 12);
    expect(map).toBeCloseTo(bernoulliMap(6, 8), 12);

    const m = discreteMoments([0, 1, 5], [0.5, 0.3, 0.2]);
    expect(derive("prob-derive-moments")).toEqual([expect.closeTo(m.mean, 6), expect.closeTo(m.secondMoment, 6), expect.closeTo(m.variance, 6)]);
    expect(derive("prob-derive-bayes")).toEqual([expect.closeTo(pPositive(0.02, 0.95, 0.1), 6), expect.closeTo(bayesPosterior(0.02, 0.95, 0.1), 5), expect.closeTo(9.5, 6)]);
    expect(derive("prob-derive-gaussian-mle")).toEqual([5, expect.closeTo(variance(x), 6), expect.closeTo(variance(x, 1), 5)]);
    expect(derive("prob-derive-nll")[0]).toBeCloseTo(binaryLogLoss([1, 1, 0], [0.8, 0.6, 0.3]), 5);
    expect(derive("prob-derive-nll")[1]).toBeCloseTo(binaryLogLoss([1, 0], [0.5, 0.5]), 5);
    const n1 = sampleSizePerArm(0.1, 0.01);
    expect(derive("prob-derive-sample-size")).toEqual([expect.closeTo(n1, 3), expect.closeTo(sampleSizePerArm(0.1, 0.02), 3), expect.closeTo(2 * n1, 3)]);
    expect(derive("prob-derive-sample-size")[0] / derive("prob-derive-sample-size")[1]).toBeCloseTo(4, 9);
    expect(derive("prob-derive-pvalue")).toEqual([expect.closeTo(twoSidedP(2), 4), expect.closeTo(twoSidedP(2) / 2, 4), 0.98]);
  });

  it("the generated JSON is not stale and mcq answers are spread over all four slots", () => {
    const r = spawnSync("node", ["scripts/gen-probability.mjs", "--check"], { encoding: "utf8" });
    expect(r.stderr).toBe("");
    expect(r.status).toBe(0);
    const idx = PROBABILITY_DECK.cards.filter((c) => c.kind === "mcq").map((c) => (c as { answer: number }).answer);
    expect(new Set(idx).size).toBe(4);
  }, 60_000);
});

describe("probability solvers", () => {
  it("erf matches known values across both branches", () => {
    expect(erf(0)).toBe(0);
    expect(erf(1)).toBeCloseTo(0.8427007929497149, 10);
    expect(erf(-1)).toBeCloseTo(-0.8427007929497149, 10);
    expect(erf(2.9)).toBeCloseTo(0.9999589021219005, 10);
    expect(erf(3.5)).toBeCloseTo(0.9999992569016276, 10);
    expect(withinSigmas(2)).toBeCloseTo(0.9544997361036416, 9);
    expect(withinSigmas(3)).toBeCloseTo(0.9973002039367398, 9);
  });
  it("KL is non-negative, zero only at equality, and cross-entropy = entropy + KL", () => {
    const p = [0.5, 0.25, 0.25];
    const q = [0.7, 0.2, 0.1];
    expect(klDivergence(p, p)).toBeCloseTo(0, 12);
    expect(klDivergence(p, q)).toBeGreaterThan(0);
    expect(crossEntropy(p, q)).toBeCloseTo(entropy(p) + klDivergence(p, q), 12);
  });
  it("MAP shrinks toward the prior and agrees with the MLE as data grows", () => {
    expect(bernoulliMap(0, 0)).toBe(0.5);
    expect(Math.abs(bernoulliMap(750, 1000) - bernoulliMle(750, 1000))).toBeLessThan(0.002);
    expect(bernoulliMap(3, 3)).toBeLessThan(bernoulliMle(3, 3));
  });
  it("posterior falls as the base rate falls", () => {
    expect(bayesPosterior(0.001, 0.99, 0.01)).toBeCloseTo(99 / 1098, 9);
    expect(bayesPosterior(0.001, 0.99, 0.01)).toBeLessThan(bayesPosterior(0.01, 0.99, 0.01));
  });
});
