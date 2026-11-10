import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { METRICS_DECK } from "../lib/cards/samples";
import { averagePrecision, fBeta, meanReciprocalRank, ndcg, npv, ppv, precision, precisionAtK, rSquared, recall, rocAuc, standardErrorProportion } from "../lib/solvers/evalMetrics";

type Card = { id: string; choices?: string[]; answer?: number | number[]; answers?: number[] };
const byId = (id: string) => METRICS_DECK.cards.find((c) => c.id === id) as unknown as Card;
const predict = (id: string) => { const c = byId(id); return c.choices![c.answer as number]; };
const derive = (id: string) => byId(id).answers!;

describe("Metric Market deck", () => {
  it("has enough cards over five topics, with unique ids", () => {
    expect(METRICS_DECK.cards.length).toBeGreaterThanOrEqual(34);
    expect(new Set(METRICS_DECK.cards.map((c) => c.id)).size).toBe(METRICS_DECK.cards.length);
    expect(new Set(METRICS_DECK.cards.map((c) => c.topic)).size).toBe(5);
  });

  it("predict answers match independent TypeScript solvers", () => {
    const [p, r] = predict("met-pr").split(" ").map(Number);
    expect(p).toBeCloseTo(precision(30, 10), 3);
    expect(r).toBeCloseTo(recall(30, 20), 3);
    expect(Number(predict("met-f1"))).toBeCloseTo(fBeta(0.75, 0.6), 4);
    expect(Number(predict("met-fbeta"))).toBeCloseTo(fBeta(0.5, 1, 2), 4);
    expect(Number(predict("met-rare-precision"))).toBeCloseTo(precision(50, 99), 3);
    expect(Number(predict("met-base-rate"))).toBeCloseTo(ppv(0.99, 0.99, 0.001), 2);
    expect(Number(predict("met-auc-rank"))).toBe(rocAuc([0.1, 0.4, 0.35, 0.8], [0, 0, 1, 1]));
    expect(Number(predict("met-se-accuracy"))).toBeCloseTo(standardErrorProportion(0.8, 400), 3);
    expect(Number(predict("met-p-at-k"))).toBeCloseTo(precisionAtK([1, 0, 1, 1, 0], 3), 3);
    expect(Number(predict("met-mrr"))).toBeCloseTo(meanReciprocalRank([1, 3, 2]), 4);
    expect(Number(predict("met-ndcg"))).toBeCloseTo(ndcg([2, 3, 0]), 4);
    expect(Number(predict("met-r2-negative"))).toBeCloseTo(rSquared([1, 2, 3, 6], [10, 10, 10, 10]), 2);
  });

  it("derive answers match independent solvers", () => {
    const p = precision(40, 10), r = recall(40, 20);
    expect(derive("met-derive-prf")).toEqual([expect.closeTo(p, 5), expect.closeTo(r, 5), expect.closeTo(fBeta(p, r), 5)]);
    expect(derive("met-derive-ppv")).toEqual([expect.closeTo(ppv(0.9, 0.95, 0.02), 5), expect.closeTo(npv(0.9, 0.95, 0.02), 5)]);
    const s = [0.9, 0.8, 0.7, 0.6, 0.55, 0.4], y = [1, 1, 0, 1, 0, 0];
    expect(derive("met-derive-auc-ap")).toEqual([expect.closeTo(rocAuc(s, y), 5), expect.closeTo(averagePrecision(s, y), 5)]);
  });

  it("a mid-rank tie counts half in AUC and a random scorer sits at 0.5", () => {
    expect(rocAuc([0.5, 0.5], [1, 0])).toBe(0.5);
    expect(rocAuc([3, 2, 1, 0], [1, 1, 0, 0])).toBe(1);
  });

  it("the generated JSON is not stale and mcq answers are spread over all four slots", () => {
    const r = spawnSync("node", ["scripts/gen-metrics.mjs", "--check"], { encoding: "utf8" });
    expect(r.stderr).toBe("");
    expect(r.status).toBe(0);
    const idx = METRICS_DECK.cards.filter((c) => c.kind === "mcq").map((c) => (c as unknown as { answer: number }).answer);
    expect(new Set(idx).size).toBe(4);
  }, 60_000);
});
