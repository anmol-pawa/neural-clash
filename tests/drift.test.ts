import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { DRIFT_DECK } from "../lib/cards/samples";
import { drift } from "../lib/solvers";

const ramp = (n: number, f: (u: number) => number = (u) => u) => Array.from({ length: n }, (_, i) => f(i / (n - 1)));

describe("quantile and bins", () => {
  it("matches the linear-interpolation definition", () => {
    expect(drift.quantile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(drift.quantile([4, 1, 3, 2], 0)).toBe(1);
    expect(drift.quantile([4, 1, 3, 2], 1)).toBe(4);
    expect(drift.quantile([10], 0.3)).toBe(10);
    expect(() => drift.quantile([], 0.5)).toThrow();
  });
  it("bin proportions sum to one and send an edge value up", () => {
    const p = drift.binProportions([0, 1, 1, 2, 5], [1, 2]);
    expect(p).toEqual([0.2, 0.4, 0.4]);
  });
});

describe("PSI", () => {
  it("hand computed value", () => {
    expect(drift.psiFromProportions([0.5, 0.5], [0.7, 0.3])).toBeCloseTo(0.2 * Math.log(1.4) + 0.2 * Math.log(1 / 0.6), 12);
  });
  it("is zero for identical data, symmetric, and non-negative", () => {
    const base = ramp(500);
    expect(drift.psi(base, base)).toBeCloseTo(0, 12);
    const e = [0.1, 0.2, 0.7];
    const a = [0.3, 0.3, 0.4];
    expect(drift.psiFromProportions(e, a)).toBeCloseTo(drift.psiFromProportions(a, e), 12);
    expect(drift.psiFromProportions(e, a)).toBeGreaterThan(0);
  });
  it("grows with the size of the shift and is classified", () => {
    const base = ramp(1000);
    const small = drift.psi(base, ramp(1000, (u) => u + 0.05));
    const big = drift.psi(base, ramp(1000, (u) => u + 0.5));
    expect(small).toBeLessThan(big);
    expect(drift.psiBand(0.05)).toBe("stable");
    expect(drift.psiBand(0.1)).toBe("moderate");
    expect(drift.psiBand(0.25)).toBe("major");
  });
  it("an empty live bin is finite thanks to the epsilon floor", () => {
    const v = drift.psiFromProportions([0.5, 0.5], [1, 0]);
    expect(Number.isFinite(v)).toBe(true);
    expect(v).toBeGreaterThan(1);
  });
  it("uses baseline edges: a live sample far outside the range lands in one end bin", () => {
    const base = ramp(100);
    const edges = drift.quantileEdges(base, 4);
    expect(drift.binProportions([5, 6, 7, 8], edges)).toEqual([0, 0, 0, 1]);
  });
});

describe("two-sample KS", () => {
  it("hand examples", () => {
    expect(drift.ks2Statistic([1, 2, 3], [4, 5, 6])).toBe(1);
    expect(drift.ks2Statistic([1, 3], [2, 4])).toBe(0.5);
    expect(drift.ks2Statistic([1, 2, 3], [1, 2, 3])).toBe(0);
  });
  it("matches a brute-force evaluation of both ECDFs at every point", () => {
    let s = 12345;
    const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
    const a = Array.from({ length: 37 }, () => rnd() * 3);
    const b = Array.from({ length: 53 }, () => rnd() * 3 + 0.4);
    const cdf = (x: number[], t: number) => x.filter((v) => v <= t).length / x.length;
    const brute = Math.max(...[...a, ...b].map((t) => Math.abs(cdf(a, t) - cdf(b, t))));
    expect(drift.ks2Statistic(a, b)).toBeCloseTo(brute, 12);
    expect(drift.ks2Statistic(a, b)).toBeCloseTo(drift.ks2Statistic(b, a), 12);
  });
  it("p-value: 1 at D=0, tiny for a big gap, and large n makes a small D significant", () => {
    expect(drift.ks2PValue(0, 50, 50)).toBe(1);
    expect(drift.ks2PValue(1, 50, 50)).toBeLessThan(1e-10);
    expect(drift.ks2PValue(0.05, 100, 100)).toBeGreaterThan(0.9);
    expect(drift.ks2PValue(0.05, 100000, 100000)).toBeLessThan(1e-10);
    // textbook critical value: D = 1.36 sqrt((n+m)/(nm)) is about p = 0.05
    expect(drift.ks2PValue(1.358 * Math.sqrt(2 / 100), 100, 100)).toBeCloseTo(0.05, 1);
  });
});

describe("rolling alarm", () => {
  const opts = { window: 10, mean: 0, std: 1, zLimit: 3 };
  it("never fires on a stream sitting on the baseline mean", () => {
    expect(drift.rollingAlarm(new Array(100).fill(0), opts)).toBe(-1);
  });
  it("fires once enough shifted points enter the window", () => {
    const stream = [...new Array(50).fill(0), ...new Array(50).fill(2)];
    // window mean needs z = mean / (1/sqrt(10)) > 3  =>  mean > 0.9487: 5 shifted points give 1.0
    expect(drift.rollingAlarm(stream, opts)).toBe(54);
  });
  it("patience delays the alarm by that many extra windows", () => {
    const stream = [...new Array(50).fill(0), ...new Array(50).fill(2)];
    expect(drift.rollingAlarm(stream, { ...opts, patience: 3 })).toBe(56);
  });
  it("a single outlier is absorbed by the window (no alarm) but fires with window 1", () => {
    const stream = [...new Array(30).fill(0), 5, ...new Array(30).fill(0)];
    expect(drift.rollingAlarm(stream, opts)).toBe(-1);
    expect(drift.rollingAlarm(stream, { ...opts, window: 1 })).toBe(30);
  });
  it("rejects bad parameters", () => {
    expect(() => drift.rollingAlarm([1], { ...opts, window: 0 })).toThrow();
    expect(() => drift.rollingAlarm([1], { ...opts, std: 0 })).toThrow();
  });
});

type Card = { id: string; kind: string; topic: string; choices?: string[]; answer?: number | number[]; answers?: number[]; line?: number };
const byId = (id: string) => DRIFT_DECK.cards.find((c) => c.id === id) as unknown as Card;
const predict = (id: string) => { const c = byId(id); return c.choices![c.answer as number]; };

describe("Drift deck", () => {
  it("has enough cards, unique ids and a spread of answer slots", () => {
    expect(DRIFT_DECK.cards.length).toBeGreaterThanOrEqual(12);
    expect(new Set(DRIFT_DECK.cards.map((c) => c.id)).size).toBe(DRIFT_DECK.cards.length);
    const slots = new Set(DRIFT_DECK.cards.filter((c) => c.kind === "mcq").map((c) => (c as unknown as Card).answer));
    expect(slots.size).toBeGreaterThan(2);
  });
  it("natively computed answers agree with the TypeScript solvers", () => {
    expect(Number(predict("drift-psi-hand"))).toBeCloseTo(drift.psiFromProportions([0.5, 0.5], [0.7, 0.3]), 4);
    const x = Array.from({ length: 1000 }, (_, i) => i / 999);
    const [same, shifted] = predict("drift-psi-shift").split(" ").map(Number);
    expect(same).toBeCloseTo(drift.psi(x, x), 2);
    expect(shifted).toBeCloseTo(drift.psi(x, x.map((v) => v + 0.5)), 2);
    expect(Number(predict("drift-psi-empty"))).toBeCloseTo(drift.psiFromProportions([0.5, 0.5], [1, 0]), 2);
    expect(Number(predict("drift-ks-hand"))).toBe(drift.ks2Statistic([1, 3], [2, 4]));
    const stream = [...new Array(50).fill(0), ...new Array(50).fill(2)];
    expect(Number(predict("drift-alarm-index"))).toBe(drift.rollingAlarm(stream, { window: 10, mean: 0, std: 1, zLimit: 3 }));
  });
  it("the derive answers match the solver", () => {
    const e = [0.4, 0.4, 0.2];
    const a = [0.2, 0.4, 0.4];
    const [total, b1, b3] = byId("drift-derive-psi").answers!;
    expect(total).toBeCloseTo(drift.psiFromProportions(e, a), 5);
    expect(b1).toBeCloseTo(drift.psiFromProportions([e[0]], [a[0]]), 5);
    expect(b3).toBeCloseTo(drift.psiFromProportions([e[2]], [a[2]]), 5);
  });
  it("bug cards point at the faulty line", () => {
    expect(byId("drift-bug-denominator").line).toBe(5);
    expect(byId("drift-bug-grid").line).toBe(4);
  });
  it("the committed deck is exactly what the native generator recomputes", () => {
    const r = spawnSync("node", ["scripts/gen-drift.mjs", "--check"], { encoding: "utf8" });
    expect(r.status, r.stderr).toBe(0);
  });
});
