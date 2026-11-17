import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { SEQ_DECK } from "../lib/cards/samples";
import { rnn } from "../lib/solvers";

type Card = { id: string; kind: string; topic: string; choices?: string[]; answer?: number | number[]; answers?: number[] };
const byId = (id: string) => SEQ_DECK.cards.find((c) => c.id === id) as unknown as Card;
const predict = (id: string) => { const c = byId(id); return c.choices![c.answer as number]; };
const derive = (id: string) => byId(id).answers!;

describe("Recurrent Rapids deck", () => {
  it("has enough cards over four topics, with unique ids", () => {
    expect(SEQ_DECK.cards.length).toBeGreaterThanOrEqual(32);
    expect(new Set(SEQ_DECK.cards.map((c) => c.id)).size).toBe(SEQ_DECK.cards.length);
    expect(new Set(SEQ_DECK.cards.map((c) => c.topic))).toEqual(new Set(["seq-rnn", "seq-grad", "seq-gates", "seq-embed"]));
  });

  it("parameter counts (computed by python) match an independent TypeScript count", () => {
    const cell = (d: number, h: number) => h * d + h * h + h;
    expect(Number(predict("seq-rnn-params"))).toBe(cell(8, 16));
    expect(predict("seq-lstm-params")).toBe(`${4 * cell(8, 16)} ${3 * cell(8, 16)}`);
    expect(derive("seq-derive-params")).toEqual([4 * cell(32, 64), 10000 * 32]);
  });

  it("the scalar RNN states equal the unrolled recurrence", () => {
    let h = 0;
    const hs = [1, -1, 2].map((x) => (h = Math.tanh(0.5 * h + x)));
    derive("seq-derive-rnn").forEach((v, i) => expect(v).toBeCloseTo(hs[i], 5));
  });

  it("the BPTT derivation equals central finite differences of L = w^T h0", () => {
    const L = (w: number, h0: number) => { let h = h0; for (let t = 0; t < 10; t++) h *= w; return h; };
    const e = 1e-6;
    const [dh0, dw] = derive("seq-derive-bptt");
    expect((L(0.9, 1 + e) - L(0.9, 1 - e)) / (2 * e)).toBeCloseTo(dh0, 4);
    expect((L(0.9 + e, 1) - L(0.9 - e, 1)) / (2 * e)).toBeCloseTo(dw, 4);
  });

  it("gradient-product and gate-path answers match the solver arithmetic", () => {
    expect(Number(predict("seq-vanish-product"))).toBeCloseTo(0.5 ** 20, 8);
    expect(Number(predict("seq-explode-product"))).toBeCloseTo(1.5 ** 20, 0);
    const [a, b] = predict("seq-cell-path").split(" ").map(Number);
    expect(a).toBeCloseTo(rnn.cellPathGain(Array(50).fill(0.99)), 3);
    expect(b).toBeCloseTo(rnn.cellPathGain(Array(50).fill(0.9)), 3);
  });

  it("the GRU copy answer agrees with gruStep when the update gate saturates", () => {
    const gate = (b: number) => ({ Wx: [[0]], Wh: [[0]], b: [b] });
    const open = rnn.gruStep({ z: gate(40), r: gate(0), n: gate(Math.atanh(-0.3)) }, [0], [0.7]);
    expect(open.h[0]).toBeCloseTo(Number(predict("seq-gru-copy")), 6);
  });

  it("embedding gradient and masked-mean answers match explicit loops", () => {
    const ids = [2, 0, 2];
    const dE = [0, 0, 0, 0];
    for (const i of ids) dE[i] += 1;
    expect(predict("seq-embed-grad")).toBe(JSON.stringify(dE.map((v) => v.toFixed(1))).replace(/"/g, "").replace(/,/g, ", "));
    const loss = [[1, 2, 3], [4, 0, 0]];
    const mask = [[1, 1, 1], [1, 0, 0]];
    let num = 0, den = 0;
    loss.forEach((row, i) => row.forEach((v, j) => { num += v * mask[i][j]; den += mask[i][j]; }));
    expect(Number(predict("seq-masked-mean"))).toBeCloseTo(num / den, 9);
  });

  it("the BPTT-memory answer matches T x N x H x 4 bytes", () => {
    expect(Number(predict("seq-bptt-memory"))).toBeCloseTo((1000 * 32 * 256 * 4) / 1e6, 9);
  });

  it("the generated JSON is not stale and mcq answers are spread over all four slots", () => {
    const r = spawnSync("node", ["scripts/gen-seq.mjs", "--check"], { encoding: "utf8" });
    expect(r.stderr).toBe("");
    expect(r.status).toBe(0);
    const idx = SEQ_DECK.cards.filter((c) => c.kind === "mcq").map((c) => (c as unknown as { answer: number }).answer);
    expect(new Set(idx).size).toBe(4);
  }, 60_000);
});
