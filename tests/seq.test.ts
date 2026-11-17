import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { SEQ_DECK } from "../lib/cards/samples";
import { rnn } from "../lib/solvers";

type Card = { id: string; kind: string; topic: string; choices?: string[]; answer?: number | number[]; answers?: number[] };
const byId = (id: string) => SEQ_DECK.cards.find((c) => c.id === id) as unknown as Card;
const predict = (id: string) => { const c = byId(id); return c.choices![c.answer as number]; };
const derive = (id: string) => byId(id).answers!;

describe("Recurrent Rapids deck", () => {
  it("has enough cards over six topics, with unique ids", () => {
    expect(SEQ_DECK.cards.length).toBeGreaterThanOrEqual(32);
    expect(new Set(SEQ_DECK.cards.map((c) => c.id)).size).toBe(SEQ_DECK.cards.length);
    expect(new Set(SEQ_DECK.cards.map((c) => c.topic)).size).toBe(6);
  });

  it("the BPTT derive answers equal central finite differences of the scalar recurrence", () => {
    const last = (w: number, xs: number[]) => xs.reduce((h, x) => w * h + x, 0);
    const e = 1e-6;
    const fd = (f: (v: number) => number, v: number) => (f(v + e) - f(v - e)) / (2 * e);
    const x = [1, 2, 3];
    const [h3, dw, dx1, dx3] = derive("seq-derive-bptt");
    expect(last(0.5, x)).toBeCloseTo(h3, 6);
    expect(fd((v) => last(v, x), 0.5)).toBeCloseTo(dw, 4);
    expect(fd((v) => last(0.5, [v, 2, 3]), 1)).toBeCloseTo(dx1, 4);
    expect(fd((v) => last(0.5, [1, 2, v]), 3)).toBeCloseTo(dx3, 4);
  });

  it("gain and parameter answers agree with the independent TypeScript solvers", () => {
    expect(derive("seq-derive-gain")).toEqual([0.9, 0.99, 0.999].map((f) => Math.round(f ** 50 * 1e6) / 1e6));
    const g = rnn.cellPathGain(Array(50).fill(0.99));
    expect(Number(predict("seq-lstm-decay"))).toBeCloseTo(g, 4);
    const per = (d: number, h: number) => h * (d + h) + h;
    expect(derive("seq-derive-params")).toEqual([4 * per(32, 64), 3 * per(32, 64)]);
    expect(predict("seq-gate-params")).toBe(`${4 * per(10, 20)} ${3 * per(10, 20)}`);
  });

  it("the InfoNCE and SGNS answers match a TypeScript recomputation", () => {
    const nce = (s: number[], tau: number) => { const z = s.map((v) => v / tau); return -Math.log(Math.exp(z[0]) / z.reduce((a, v) => a + Math.exp(v), 0)); };
    expect(Number(predict("seq-infonce"))).toBeCloseTo(nce([2, 0, 0], 1), 4);
    const [a, b] = predict("seq-infonce-temp").split(" ").map(Number);
    expect(a).toBeCloseTo(nce([0.5, 0.4, 0], 1), 4);
    expect(b).toBeCloseTo(nce([0.5, 0.4, 0], 0.1), 4);
    expect(b).toBeLessThan(a);
    expect(Number(predict("seq-sgns-loss"))).toBeCloseTo(3 * Math.log(2), 4);
  });

  it("the generated JSON is not stale and mcq answers are spread over all four slots", () => {
    const r = spawnSync("node", ["scripts/gen-seq.mjs", "--check"], { encoding: "utf8" });
    expect(r.stderr).toBe("");
    expect(r.status).toBe(0);
    const idx = SEQ_DECK.cards.filter((c) => c.kind === "mcq").map((c) => (c as unknown as { answer: number }).answer);
    expect(new Set(idx).size).toBe(4);
  }, 60_000);
});
