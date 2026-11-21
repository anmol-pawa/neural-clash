import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { ATTENTION_DECK } from "../lib/cards/samples";
import { attention, transformer } from "../lib/solvers";

type Card = { id: string; kind: string; topic: string; choices?: string[]; answer?: number | number[]; answers?: number[] };
const byId = (id: string) => ATTENTION_DECK.cards.find((c) => c.id === id) as unknown as Card;
const predict = (id: string) => { const c = byId(id); return c.choices![c.answer as number]; };
const derive = (id: string) => byId(id).answers!;

describe("Attention Atoll deck", () => {
  it("has enough cards over six topics, with unique ids", () => {
    expect(ATTENTION_DECK.cards.length).toBeGreaterThanOrEqual(30);
    expect(new Set(ATTENTION_DECK.cards.map((c) => c.id)).size).toBe(ATTENTION_DECK.cards.length);
    expect(new Set(ATTENTION_DECK.cards.map((c) => c.topic)).size).toBe(6);
  });

  it("the attention answers agree with the independent TypeScript solver", () => {
    const [w1, w2, o0] = derive("attn-derive-weights");
    const r = attention.scaledDotAttention([[2, 0]], [[1, 0], [0, 1]], [[10, 0], [0, 10]]);
    expect(w1).toBeCloseTo(r.weights[0][0], 5);
    expect(w2).toBeCloseTo(r.weights[0][1], 5);
    expect(o0).toBeCloseTo(r.out[0][0], 4);
    const causal = attention.scaledDotAttention([[0], [0], [0]], [[0], [0], [0]], [[1], [2], [3]], attention.causalMask(3));
    const rounded = (m: number[][]) => m.map((row) => row.map((v) => Math.round(v * 1000) / 1000));
    expect(rounded(causal.weights)).toEqual(JSON.parse(predict("attn-causal-weights")));
    expect(rounded(attention.softmaxRows([[1000, 1001, 1002]]))[0]).toEqual(JSON.parse(predict("attn-softmax-stable")));
    expect(rounded(attention.sinusoidalPE(2, 4))[1]).toEqual(JSON.parse(predict("attn-pe-sinusoid")));
    expect(Number(predict("attn-mha-params"))).toBe(attention.mhaParams(64));
  });

  it("block parameter and FLOP-crossover answers agree with solvers.transformer", () => {
    const shape = { dModel: 512, dFF: 2048 };
    const [attn, ffn, ln, total] = derive("attn-derive-block");
    expect(attn + ffn + ln).toBe(total);
    expect(total).toBe(transformer.blockParams(shape));
    const [cross, share] = derive("attn-derive-crossover");
    expect(cross).toBe(transformer.attentionCrossoverT(shape));
    expect(share).toBeCloseTo(transformer.attentionFlopShare(1024, shape), 5);
  });

  it("the memory and parameter predictions follow the stated formulas", () => {
    expect(Number(predict("attn-matrix-bytes"))).toBe((4096 * 4096 * 16 * 2) / 2 ** 20);
    expect(Number(predict("attn-ffn-ratio"))).toBe(2);
    expect(predict("attn-future-leak")).toBe("True False");
    expect(predict("attn-rope-relative")).toBe("True False");
    expect(Number(predict("attn-mask-after"))).toBe(0.75);
  });

  it("the generated JSON is not stale and mcq answers are spread over all four slots", () => {
    const r = spawnSync("node", ["scripts/gen-attention.mjs", "--check"], { encoding: "utf8" });
    expect(r.stderr).toBe("");
    expect(r.status).toBe(0);
    const idx = ATTENTION_DECK.cards.filter((c) => c.kind === "mcq").map((c) => (c as unknown as { answer: number }).answer);
    expect(new Set(idx).size).toBe(4);
  }, 60_000);
});
