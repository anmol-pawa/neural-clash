import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { CNN_DECK } from "../lib/cards/samples";
import { conv } from "../lib/solvers";

type Card = { id: string; kind: string; topic: string; choices?: string[]; answer?: number | number[]; answers?: number[] };
const byId = (id: string) => CNN_DECK.cards.find((c) => c.id === id) as unknown as Card;
const predict = (id: string) => { const c = byId(id); return c.choices![c.answer as number]; };
const derive = (id: string) => byId(id).answers!;

describe("Conv Caverns deck", () => {
  it("has enough cards over six topics, with unique ids", () => {
    expect(CNN_DECK.cards.length).toBeGreaterThanOrEqual(32);
    expect(new Set(CNN_DECK.cards.map((c) => c.id)).size).toBe(CNN_DECK.cards.length);
    expect(new Set(CNN_DECK.cards.map((c) => c.topic)).size).toBe(6);
  });

  it("size and cost answers (computed by numpy) match the independent TypeScript conv solvers", () => {
    expect(Number(predict("cnn-same-size"))).toBe(conv.outSize(28, 5, 1, 2));
    expect(Number(predict("cnn-stride-floor"))).toBe(conv.outSize(32, 3, 2, 0));
    expect(Number(predict("cnn-transposed"))).toBe(conv.transposedOutSize(7, 4, 2, 1));
    const [ke, side] = predict("cnn-dilated-kernel").split(" ").map(Number);
    expect(ke).toBe(conv.effectiveKernel(3, 2));
    expect(side).toBe(conv.outSize(32, 3, 1, 0, 2));
    expect(Number(predict("cnn-params-conv"))).toBe(conv.convParams(3, 16, [3, 3]));
    expect(Number(predict("cnn-params-dense"))).toBe(conv.denseParams(32 * 32 * 3, 32 * 32 * 16));
    expect(Number(predict("cnn-macs"))).toBe(conv.convMacs({ c: 16, h: 32, w: 32 }, 3, [3, 3]));
    expect(Number(predict("cnn-one-by-one"))).toBe(conv.convParams(256, 64, [1, 1]));
    const [dw, std] = predict("cnn-depthwise").split(" ").map(Number);
    expect(dw).toBe(conv.convParams(64, 64, [3, 3], 64, false));
    expect(std).toBe(conv.convParams(64, 64, [3, 3], 1, false));
  });

  it("receptive-field answers match the layer-stack summary", () => {
    const rf = (layers: conv.ConvSpec[]) => conv.summarize({ c: 1, h: 64, w: 64 }, layers).at(-1)!.receptiveField;
    const c = (stride: number): conv.ConvSpec => ({ kind: "conv", k: [3, 3], stride, out: 1 });
    expect(Number(predict("cnn-rf-stack"))).toBe(rf([c(1), c(1), c(1)]));
    expect(Number(predict("cnn-rf-stride"))).toBe(rf([c(1), c(2), c(1)]));
  });

  it("the by-hand stack and cost derivations agree with the layer-stack summary", () => {
    const layers: conv.ConvSpec[] = [
      { kind: "conv", k: [3, 3], pad: "same", out: 16 },
      { kind: "pool", k: [2, 2] },
      { kind: "conv", k: [3, 3], pad: "same", out: 32 },
      { kind: "pool", k: [2, 2] },
    ];
    const r = conv.summarize({ c: 1, h: 32, w: 32 }, layers);
    const end = r.at(-1)!.out;
    expect(derive("cnn-derive-stack")).toEqual([end.h, conv.totals(r).params, end.c * end.h * end.w]);
    const one = conv.summarize({ c: 64, h: 56, w: 56 }, [{ kind: "conv", k: [3, 3], pad: "same", out: 64 }]);
    expect(derive("cnn-derive-cost")).toEqual([one[0].params, one[0].macs]);
  });

  it("the 1-D convolution backward answers equal central finite differences", () => {
    const x = [1, 2, 3, 4];
    const loss = (k: number[], xs: number[]) => { let s = 0; for (let i = 0; i < 3; i++) { const y = k[0] * xs[i] + k[1] * xs[i + 1]; s += (y * y) / 2; } return s; };
    const k = [1, -1];
    const e = 1e-6;
    const fd = (f: (v: number) => number, v: number) => (f(v + e) - f(v - e)) / (2 * e);
    const [dk0, dk1, dx0, dx3] = derive("cnn-derive-backward");
    expect(fd((v) => loss([v, k[1]], x), k[0])).toBeCloseTo(dk0, 4);
    expect(fd((v) => loss([k[0], v], x), k[1])).toBeCloseTo(dk1, 4);
    expect(fd((v) => loss(k, [v, 2, 3, 4]), x[0])).toBeCloseTo(dx0, 4);
    expect(fd((v) => loss(k, [1, 2, 3, v]), x[3])).toBeCloseTo(dx3, 4);
  });

  it("the generated JSON is not stale and mcq answers are spread over all four slots", () => {
    const r = spawnSync("node", ["scripts/gen-cnn.mjs", "--check"], { encoding: "utf8" });
    expect(r.stderr).toBe("");
    expect(r.status).toBe(0);
    const idx = CNN_DECK.cards.filter((c) => c.kind === "mcq").map((c) => (c as unknown as { answer: number }).answer);
    expect(new Set(idx).size).toBe(4);
  }, 60_000);
});
