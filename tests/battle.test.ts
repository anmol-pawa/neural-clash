import { describe, expect, it } from "vitest";
import { answer, currentCard, next, startBattle, summarize, damageFor, DEFAULT_CONFIG } from "@/lib/battle/battle";
import { gradeCard, parseShape, parseNumber, type Card } from "@/lib/battle/cards";
import { generatedDeck } from "@/lib/battle/deck";
import { GENERATORS } from "@/lib/battle/generators";
import { makeRng } from "@/lib/battle/rng";
import * as S from "@/lib/solvers";

/** Central finite difference of f at x[i]. */
const fd = (f: (x: number[]) => number, x: number[], i: number, h = 1e-5): number => {
  const a = [...x]; const b = [...x];
  a[i] += h; b[i] -= h;
  return (f(a) - f(b)) / (2 * h);
};

describe("solvers: gradients match finite differences", () => {
  it("softmax cross-entropy", () => {
    const z = [0.3, -1.2, 2.1, 0.4];
    for (const y of [0, 2, 3]) {
      const g = S.softmaxCrossEntropyGrad(z, y);
      z.forEach((_, i) => expect(g[i]).toBeCloseTo(fd((v) => S.softmaxCrossEntropy(v, y), z, i), 6));
    }
  });
  it("BCE with logits", () => {
    for (const z of [-3, -0.2, 0, 1.7, 4]) for (const y of [0, 1] as const)
      expect(S.bceWithLogitsGrad(z, y)).toBeCloseTo(fd(([v]) => S.bceWithLogits(v, y), [z], 0), 6);
  });
  it("MSE", () => {
    const p = [1, 2, 3]; const t = [0.5, 2.5, 1];
    const g = S.mseGrad(p, t);
    p.forEach((_, i) => expect(g[i]).toBeCloseTo(fd((v) => S.mse(v, t), p, i), 6));
  });
});

describe("solvers: numerical stability", () => {
  it("softmax and CE survive huge logits", () => {
    const p = S.softmax([1000, 1001, 999]);
    expect(p.every(Number.isFinite)).toBe(true);
    expect(p.reduce((a, b) => a + b)).toBeCloseTo(1, 12);
    expect(S.softmaxCrossEntropy([1000, 0], 0)).toBeCloseTo(0, 9);
    expect(S.softmaxCrossEntropy([-1000, 0], 0)).toBeCloseTo(1000, 6);
  });
  it("BCE with logits is finite at extreme logits where the naive form is not", () => {
    expect(S.bceWithLogits(800, 0)).toBeCloseTo(800, 6);
    expect(S.bceWithLogits(-800, 1)).toBeCloseTo(800, 6);
    expect(Number.isFinite(S.bceWithLogitsGrad(-800, 1))).toBe(true);
  });
});

describe("solvers: shapes match numpy", () => {
  it("broadcasting", () => {
    expect(S.broadcast([3, 1], [1, 4])).toEqual({ ok: true, shape: [3, 4] });
    expect(S.broadcast([5, 3, 1], [4])).toEqual({ ok: true, shape: [5, 3, 4] });
    expect(S.broadcast([3], [4]).ok).toBe(false);
  });
  it("matmul", () => {
    expect(S.matmul([2, 3], [3, 4])).toEqual({ ok: true, shape: [2, 4] });
    expect(S.matmul([3], [3, 4])).toEqual({ ok: true, shape: [4] });
    expect(S.matmul([2, 3], [3])).toEqual({ ok: true, shape: [2] });
    expect(S.matmul([5, 2, 3], [3, 4])).toEqual({ ok: true, shape: [5, 2, 4] });
    expect(S.matmul([5, 2, 3], [1, 3, 4])).toEqual({ ok: true, shape: [5, 2, 4] });
    expect(S.matmul([2, 3], [4, 5]).ok).toBe(false);
  });
  it("reduce, reshape, conv", () => {
    expect(S.reduce([2, 3, 4], 1, false)).toEqual({ ok: true, shape: [2, 4] });
    expect(S.reduce([2, 3, 4], -1, true)).toEqual({ ok: true, shape: [2, 3, 1] });
    expect(S.reduce([2, 3], 2, false).ok).toBe(false);
    expect(S.reshape([2, 3, 4], [-1, 4])).toEqual({ ok: true, shape: [6, 4] });
    expect(S.reshape([2, 3, 4], [5, -1]).ok).toBe(false);
    expect(S.convOut(28, 3, 1, 1)).toBe(28);
    expect(S.convOut(32, 5, 2, 0)).toBe(14);
  });
});

describe("solvers: metrics", () => {
  it("confusion-derived metrics", () => {
    const c = S.confusion([1, 1, 1, 0, 0, 0], [1, 1, 0, 1, 0, 0]);
    expect(c).toEqual({ tp: 2, fn: 1, fp: 1, tn: 2 });
    expect(S.precision(c)).toBeCloseTo(2 / 3);
    expect(S.recall(c)).toBeCloseTo(2 / 3);
    expect(S.f1(c)).toBeCloseTo(2 / 3);
    expect(S.accuracy(c)).toBeCloseTo(4 / 6);
  });
  it("AUC handles ties and perfect ranking", () => {
    expect(S.rocAuc([1, 1, 0, 0], [0.9, 0.8, 0.2, 0.1])).toBe(1);
    expect(S.rocAuc([1, 0], [0.5, 0.5])).toBe(0.5);
    expect(S.rocAuc([1, 0, 1, 0], [0.9, 0.8, 0.3, 0.1])).toBeCloseTo(0.75);
  });
  it("nDCG, recall@k, MRR", () => {
    expect(S.ndcg([3, 2, 1])).toBe(1);
    expect(S.ndcg([1, 2, 3])).toBeLessThan(1);
    expect(S.ndcg([0, 0])).toBe(0);
    expect(S.recallAtK([false, true, false, true], 2, 2)).toBe(0.5);
    expect(S.mrr([[false, true], [true], [false, false]])).toBeCloseTo((0.5 + 1 + 0) / 3);
  });
});

describe("generated cards", () => {
  it("are reproducible from the seed", () => {
    expect(generatedDeck(7, 22)).toEqual(generatedDeck(7, 22));
    expect(generatedDeck(7, 22)).not.toEqual(generatedDeck(8, 22));
  });
  it("every generator yields a card that its own solver answer grades correct", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const rng = makeRng(seed);
      for (const g of GENERATORS) {
        const c = g(rng, "x");
        if (c.kind === "derive" || c.kind === "metric") {
          expect(Number.isFinite(c.answer)).toBe(true);
          expect(gradeCard(c, { kind: "text", text: String(c.answer) })).toBe(true);
          expect(gradeCard(c, { kind: "text", text: String(c.answer + 0.5) })).toBe(false);
        } else if (c.kind === "shape") {
          const txt = c.answer === "error" ? "error" : `(${c.answer.join(", ")})`;
          expect(gradeCard(c, { kind: "text", text: txt })).toBe(true);
        }
        expect(c.explain.length).toBeGreaterThan(10);
      }
    }
  });
  it("shape cards include both valid and error cases over many seeds", () => {
    const answers = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) {
      const c = GENERATORS[3](makeRng(seed), "b");
      if (c.kind === "shape") answers.add(c.answer === "error" ? "error" : "ok");
    }
    expect(answers).toEqual(new Set(["ok", "error"]));
  });
});

describe("answer parsing", () => {
  it("parses shapes and numbers leniently but rejects junk", () => {
    expect(parseShape("(3, 4)")).toEqual([3, 4]);
    expect(parseShape("[3 4]")).toEqual([3, 4]);
    expect(parseShape("(5,)")).toEqual([5]);
    expect(parseShape("()")).toEqual([]);
    expect(parseShape("3,x")).toBeNull();
    expect(parseNumber(" 1,234.5 ")).toBe(1234.5);
    expect(parseNumber("abc")).toBeNull();
    expect(parseNumber("1e-3")).toBe(0.001);
  });
  it("junk input is wrong, not a crash", () => {
    const c: Card = { id: "a", kind: "derive", topic: "t", prompt: "", explain: "", answer: 1, tol: 0.01 };
    expect(gradeCard(c, { kind: "text", text: "banana" })).toBe(false);
    expect(gradeCard(c, { kind: "choice", index: 0 })).toBe(false);
  });
});

const mcq = (id: string, ans = 0): Card => ({ id, kind: "mcq", topic: `t-${id}`, prompt: "?", explain: "e", options: ["a", "b"], answer: ans });

describe("battle", () => {
  it("correct answers hurt the enemy, wrong ones cost HP and requeue the card once", () => {
    let s = startBattle([mcq("1"), mcq("2")]);
    s = answer(s, { kind: "choice", index: 1 });
    expect(s.playerHp).toBe(DEFAULT_CONFIG.playerHp - DEFAULT_CONFIG.counter);
    expect(s.queue.map((c) => c.id)).toEqual(["1", "2", "1"]);
    s = next(s);
    s = answer(s, { kind: "choice", index: 0 });
    expect(s.enemyHp).toBe(80);
    s = next(s);
    expect(currentCard(s)?.id).toBe("1");
    s = answer(s, { kind: "choice", index: 1 });
    expect(s.queue).toHaveLength(3); // not requeued a second time
  });
  it("a streak of three crits, and a miss resets it", () => {
    expect(damageFor(DEFAULT_CONFIG, 1)).toEqual({ damage: 20, crit: false });
    expect(damageFor(DEFAULT_CONFIG, 2)).toEqual({ damage: 30, crit: true });
    let s = startBattle(Array.from({ length: 6 }, (_, i) => mcq(String(i))));
    for (let i = 0; i < 3; i++) { s = answer(s, { kind: "choice", index: 0 }); s = next(s); }
    expect(s.streak).toBe(3);
    expect(s.enemyHp).toBe(100 - 20 - 20 - 30);
    s = answer(s, { kind: "choice", index: 1 });
    expect(s.streak).toBe(0);
    expect(s.bestStreak).toBe(3);
  });
  it("wins at zero enemy HP, loses at zero player HP, and ignores answers afterwards", () => {
    const cfg = { enemyHp: 20, playerHp: 15, attack: 20, counter: 15 };
    let w = startBattle([mcq("1")], cfg);
    w = answer(w, { kind: "choice", index: 0 });
    expect(w.phase).toBe("won");
    expect(answer(w, { kind: "choice", index: 0 })).toBe(w);
    let l = startBattle([mcq("1")], cfg);
    l = answer(l, { kind: "choice", index: 1 });
    expect(l.phase).toBe("lost");
    expect(summarize(l).weakTopics).toEqual(["t-1"]);
  });
  it("exhausting the deck decides on HP fractions", () => {
    const cfg = { enemyHp: 100, playerHp: 60, attack: 10, counter: 5 };
    let s = startBattle([mcq("1")], cfg);
    s = next(answer(s, { kind: "choice", index: 0 }));
    expect(s.phase).toBe("won"); // player 100 % vs enemy 90 %
    let t = startBattle([mcq("1"), mcq("2")], cfg);
    t = next(answer(t, { kind: "choice", index: 1 }));
    t = next(answer(t, { kind: "choice", index: 1 })); // both missed, requeued
    t = next(answer(t, { kind: "choice", index: 1 }));
    t = next(answer(t, { kind: "choice", index: 1 }));
    expect(t.phase).toBe("lost");
  });
  it("rejects an empty deck", () => {
    expect(() => startBattle([])).toThrow();
  });
});
