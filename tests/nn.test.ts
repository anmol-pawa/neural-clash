import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { NN_DECK } from "../lib/cards/samples";
import { centralDifference, crossEntropy, heVariance, logitsGrad, mlpMacs, mlpParams, sigmoidGrad, twoLayerBackward, twoLayerForward, xavierVariance, type TwoLayer } from "../lib/solvers/nn";

type Card = { id: string; kind: string; topic: string; choices?: string[]; answer?: number | number[]; answers?: number[] };
const byId = (id: string) => NN_DECK.cards.find((c) => c.id === id) as unknown as Card;
const predict = (id: string) => { const c = byId(id); return c.choices![c.answer as number]; };
const derive = (id: string) => byId(id).answers!;

describe("Neuron Nest deck", () => {
  it("has enough cards over seven topics, with unique ids", () => {
    expect(NN_DECK.cards.length).toBeGreaterThanOrEqual(37);
    expect(new Set(NN_DECK.cards.map((c) => c.id)).size).toBe(NN_DECK.cards.length);
    expect(new Set(NN_DECK.cards.map((c) => c.topic)).size).toBe(7);
  });

  it("predict answers match independent TypeScript solvers", () => {
    expect(Number(predict("nn-param-count"))).toBe(mlpParams([784, 128, 10]));
    expect(Number(predict("nn-ce-loss"))).toBeCloseTo(crossEntropy([2, 1, 0], 0), 4);
    expect(JSON.parse(predict("nn-softmax-grad"))).toEqual(logitsGrad([2, 1, 0], 0).map((v) => expect.closeTo(v, 3)));
    expect(JSON.parse(predict("nn-sigmoid-grad"))[0]).toBeCloseTo(sigmoidGrad(0), 5);
    expect(JSON.parse(predict("nn-sigmoid-grad"))[1]).toBeCloseTo(sigmoidGrad(10), 5);
    const [xav, he] = predict("nn-init-scale").split(" ").map(Number);
    expect(xav).toBeCloseTo(xavierVariance(256, 256), 5);
    expect(he).toBeCloseTo(heVariance(256), 5);
    expect(Number(predict("nn-vanishing"))).toBeCloseTo(0.25 ** 10, 8);
    expect(Number(predict("nn-weight-decay"))).toBeCloseTo(2 - 0.1 * (0.5 + 0.01 * 2), 4);
  });

  it("the by-hand backprop answers equal analytic and finite-difference gradients", () => {
    const net: TwoLayer = { x: [1, 2], W1: [[0.5, -0.5], [0.25, 1.0]], w2: [1, -1], t: 1 };
    const [loss, dw20, dW111] = derive("nn-derive-two-layer");
    const { loss: L } = twoLayerForward(net);
    const g = twoLayerBackward(net);
    expect(loss).toBeCloseTo(L, 5);
    expect(dw20).toBeCloseTo(g.dw2[0], 5);
    expect(dW111).toBeCloseTo(g.dW1[1][1], 5);
    // independent check: central differences on the loss itself
    const lossAt = (mut: (n: TwoLayer) => void) => { const c: TwoLayer = JSON.parse(JSON.stringify(net)); mut(c); return twoLayerForward(c).loss; };
    expect(centralDifference((v) => lossAt((n) => { n.w2[0] = v; }), 1)).toBeCloseTo(dw20, 5);
    expect(centralDifference((v) => lossAt((n) => { n.W1[1][1] = v; }), 1)).toBeCloseTo(dW111, 5);
  });

  it("softmax and cost derive answers match", () => {
    const [loss, d0, d2] = derive("nn-derive-softmax");
    expect(loss).toBeCloseTo(crossEntropy([1, 2, 3], 2), 5);
    expect(d0).toBeCloseTo(logitsGrad([1, 2, 3], 2)[0], 5);
    expect(d2).toBeCloseTo(logitsGrad([1, 2, 3], 2)[2], 5);
    expect(logitsGrad([1, 2, 3], 2).reduce((a, b) => a + b, 0)).toBeCloseTo(0, 12);
    expect(derive("nn-derive-cost")).toEqual([mlpParams([100, 50, 10]), mlpMacs([100, 50, 10])]);
  });

  it("the generated JSON is not stale and mcq answers are spread over all four slots", () => {
    const r = spawnSync("node", ["scripts/gen-nn.mjs", "--check"], { encoding: "utf8" });
    expect(r.stderr).toBe("");
    expect(r.status).toBe(0);
    const idx = NN_DECK.cards.filter((c) => c.kind === "mcq").map((c) => (c as unknown as { answer: number }).answer);
    expect(new Set(idx).size).toBe(4);
  }, 60_000);
});
