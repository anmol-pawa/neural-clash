import { describe, it, expect } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import {
  softmax, softmaxCEGrad, softmaxCrossEntropy, sigmoid, bceWithLogits, bceWithLogitsGrad, mse, mseGrad, numericGrad, logSumExp,
} from "@/lib/solvers/math";
import { broadcast, matmul, conv2d, convOut, reshape, splitHeads, reduce } from "@/lib/solvers/shapes";
import { confusion, precision, recall, f1, rocAuc, ndcg, ece, reciprocalRank, recallAtK } from "@/lib/solvers/metrics";
import { check, parseShape } from "@/lib/cards/check";
import { GENERATORS } from "@/lib/cards/generators";
import type { Card } from "@/lib/cards/types";
import { HANDWRITTEN, SOFTMAX_BUG_SRC, SOFTMAX_FIXED_SRC, demoDeck } from "@/lib/cards/samples";
import { startBattle, answer, next, summarize } from "@/lib/battle/battle";

const findPy = () =>
  ["python3", "/usr/bin/python3"].find((b) => spawnSync(b, ["-I", "-c", "import numpy"]).status === 0) ?? "python3";

const close = (a: readonly number[], b: readonly number[], tol = 1e-6) => {
  expect(a.length).toBe(b.length);
  a.forEach((v, i) => expect(Math.abs(v - b[i])).toBeLessThan(tol));
};

describe("math solvers", () => {
  it("softmax is stable for huge logits and sums to 1", () => {
    const p = softmax([1000, 1001, 999]);
    expect(p.every(Number.isFinite)).toBe(true);
    expect(p.reduce((a, b) => a + b)).toBeCloseTo(1, 12);
    expect(Number.isFinite(logSumExp([-1e4, -1e4]))).toBe(true);
  });
  it("analytic gradients match finite differences", () => {
    const z = [0.3, -1.2, 2.0, 0.7];
    close(softmaxCEGrad(z, 2), numericGrad((x) => softmaxCrossEntropy(x, 2), z), 1e-6);
    close(mseGrad([1, 2, 3], [0, 4, 3]), numericGrad((x) => mse(x, [0, 4, 3]), [1, 2, 3]), 1e-6);
    for (const y of [0, 1]) for (const z0 of [-30, -2, 0, 3, 25]) {
      const g = numericGrad((x) => bceWithLogits(x[0], y), [z0], 1e-5)[0];
      expect(Math.abs(g - bceWithLogitsGrad(z0, y))).toBeLessThan(1e-6);
    }
  });
  it("BCE and sigmoid do not overflow", () => {
    expect(Number.isFinite(bceWithLogits(-800, 1))).toBe(true);
    expect(sigmoid(-800)).toBe(0);
    expect(sigmoid(800)).toBe(1);
  });
  it("rejects bad targets", () => {
    expect(() => softmaxCEGrad([1, 2], 2)).toThrow();
    expect(() => mse([1], [1, 2])).toThrow();
  });
});

describe("shape solvers", () => {
  it("broadcasts like numpy", () => {
    expect(broadcast([5, 1, 3], [4, 1])).toEqual({ ok: true, shape: [5, 4, 3] });
    expect(broadcast([3], [4]).ok).toBe(false);
    expect(broadcast([], [2, 2])).toEqual({ ok: true, shape: [2, 2] });
  });
  it("matmul handles 1-D, batch and mismatches", () => {
    expect(matmul([3, 4], [4, 5])).toEqual({ ok: true, shape: [3, 5] });
    expect(matmul([4], [4, 5])).toEqual({ ok: true, shape: [5] });
    expect(matmul([4], [4])).toEqual({ ok: true, shape: [] });
    expect(matmul([2, 3, 4], [4, 5])).toEqual({ ok: true, shape: [2, 3, 5] });
    expect(matmul([2, 3, 4], [1, 4, 5])).toEqual({ ok: true, shape: [2, 3, 5] });
    expect(matmul([2, 3, 4], [3, 4, 5]).ok).toBe(false);
    expect(matmul([3, 4], [5, 6]).ok).toBe(false);
  });
  it("conv, reshape, heads, reduce", () => {
    expect(convOut(28, 3, 1, 1)).toBe(28);
    expect(convOut(32, 5, 2, 0)).toBe(14);
    expect(conv2d([8, 3, 32, 32], 16, [3, 3], 2, 1)).toEqual({ ok: true, shape: [8, 16, 16, 16] });
    expect(conv2d([8, 3, 2, 2], 4, [5, 5]).ok).toBe(false);
    expect(reshape([2, 3, 4], [6, -1])).toEqual({ ok: true, shape: [6, 4] });
    expect(reshape([2, 3], [4, -1]).ok).toBe(false);
    expect(reshape([2, 3], [-1, -1]).ok).toBe(false);
    expect(splitHeads([2, 5, 64], 8)).toEqual({ ok: true, shape: [2, 8, 5, 8] });
    expect(splitHeads([2, 5, 64], 5).ok).toBe(false);
    expect(reduce([2, 3, 4], -1, true)).toEqual({ ok: true, shape: [2, 3, 1] });
    expect(reduce([2, 3], 2).ok).toBe(false);
  });
});

describe("metric solvers", () => {
  it("computes precision/recall/F1 on a known table", () => {
    const c = confusion([1, 1, 1, 0, 0, 0, 0, 1], [1, 0, 1, 1, 0, 0, 0, 1]);
    expect(c).toEqual({ tp: 3, fn: 1, fp: 1, tn: 3 });
    expect(precision(c)).toBeCloseTo(0.75);
    expect(recall(c)).toBeCloseTo(0.75);
    expect(f1(c)).toBeCloseTo(0.75);
    expect(f1({ tp: 0, fp: 0, fn: 0, tn: 5 })).toBe(0);
  });
  it("AUC, nDCG, MRR, recall@k, ECE", () => {
    expect(rocAuc([1, 0, 1, 0], [0.9, 0.1, 0.8, 0.3])).toBe(1);
    expect(rocAuc([1, 0], [0.5, 0.5])).toBe(0.5);
    expect(ndcg([3, 2, 0, 1])).toBeCloseTo(0.9926, 3);
    expect(ndcg([0, 0])).toBe(0);
    expect(ndcg([1, 0, 0], 1)).toBe(1);
    expect(reciprocalRank([0, 0, 1])).toBeCloseTo(1 / 3);
    expect(recallAtK([1, 0, 1, 0], 4, 3)).toBe(0.5);
    expect(ece([0.9, 0.9, 0.9, 0.9], [1, 1, 1, 0])).toBeCloseTo(0.15);
    expect(ece([0.5, 0.5], [1, 0])).toBe(0);
  });
});

describe("python cross-check", () => {
  // Fixed cases recomputed natively with numpy, so a TS solver bug cannot hide behind its own test.
  it("matches numpy for gradients, shapes and metrics", () => {
    const py = `
import json, numpy as np
z = np.array([0.3, -1.2, 2.0, 0.7]); p = np.exp(z - z.max()); p /= p.sum(); g = p.copy(); g[2] -= 1
ce = float(-np.log(p[2]))
a = np.zeros((5,1,3)); b = np.zeros((4,1)); bc = list((a+b).shape)
mm = list((np.zeros((2,3,4)) @ np.zeros((4,5))).shape)
rels = np.array([3,2,0,1]); disc = 1/np.log2(np.arange(2, 6)); dcg = ((2**rels-1)*disc).sum()
idcg = ((2**np.sort(rels)[::-1]-1)*disc).sum()
print(json.dumps({"g": g.tolist(), "ce": ce, "bc": bc, "mm": mm, "ndcg": float(dcg/idcg)}))`;
    const out = JSON.parse(execFileSync(findPy(), ["-I", "-c", py], { encoding: "utf8" }));
    close(softmaxCEGrad([0.3, -1.2, 2.0, 0.7], 2), out.g, 1e-12);
    expect(softmaxCrossEntropy([0.3, -1.2, 2.0, 0.7], 2)).toBeCloseTo(out.ce, 12);
    expect(broadcast([5, 1, 3], [4, 1])).toEqual({ ok: true, shape: out.bc });
    expect(matmul([2, 3, 4], [4, 5])).toEqual({ ok: true, shape: out.mm });
    expect(ndcg([3, 2, 0, 1])).toBeCloseTo(out.ndcg, 12);
  });
});

describe("generated cards", () => {
  it("every generator is deterministic and self-consistent over many seeds", () => {
    for (const [name, gen] of Object.entries(GENERATORS)) {
      for (let seed = 1; seed <= 200; seed++) {
        const a = gen(seed);
        expect(gen(seed)).toEqual(a);
        expect(a.prompt.length, name).toBeGreaterThan(10);
        expect(a.explanation.length, name).toBeGreaterThan(10);
        // the stored answer must be accepted by the checker
        const ok =
          a.kind === "derive" ? check(a, { kind: "derive", values: a.answers })
          : a.kind === "shape" ? check(a, { kind: "shape", shape: a.answer })
          : check(a, { kind: "metric", value: a.answer });
        expect(ok.correct, `${name} seed ${seed}`).toBe(true);
      }
    }
  });
  it("shape generators produce both valid and error cases", () => {
    for (const name of ["matmulShape", "broadcastShape", "headsShape"] as const) {
      const answers = Array.from({ length: 200 }, (_, i) => GENERATORS[name](i + 1).answer === null);
      expect(answers.some(Boolean), name).toBe(true);
      expect(answers.some((x) => !x), name).toBe(true);
    }
  });
  it("derive answers survive a finite-difference audit", () => {
    for (let s = 1; s <= 50; s++) {
      const c = GENERATORS.bceGrad(s);
      const m = c.prompt.match(/z = (-?[\d.]+) .* y = ([01])/)!;
      const z = Number(m[1]);
      const y = Number(m[2]);
      const g = numericGrad((x) => bceWithLogits(x[0], y), [z], 1e-5)[0];
      expect(Math.abs(g - c.answers[0])).toBeLessThan(1e-6);
    }
  });
});

describe("check", () => {
  const mcq: Card = { id: "m", kind: "mcq", topic: "t", prompt: "?", explanation: "e", choices: ["a", "b"], answer: 1 };
  const multi: Card = { id: "x", kind: "multi", topic: "t", prompt: "?", explanation: "e", choices: ["a", "b", "c"], answers: [0, 2] };
  const derive: Card = { id: "d", kind: "derive", topic: "t", prompt: "?", explanation: "e", fields: ["a", "b"], answers: [0.25, -0.25], tol: 0.01 };
  const bug: Card = { id: "b", kind: "bug", topic: "t", prompt: "?", explanation: "e", code: ["a", "b"], line: 2 };
  it("mcq, multi, bug", () => {
    expect(check(mcq, { kind: "mcq", choice: 1 }).correct).toBe(true);
    expect(check(mcq, { kind: "mcq", choice: 0 }).correct).toBe(false);
    expect(check(multi, { kind: "multi", choices: [2, 0, 2] }).correct).toBe(true);
    expect(check(multi, { kind: "multi", choices: [0] }).correct).toBe(false);
    expect(check(bug, { kind: "bug", line: 2 }).correct).toBe(true);
    expect(check(bug, { kind: "mcq", choice: 2 }).correct).toBe(false);
  });
  it("derive tolerance and malformed input", () => {
    expect(check(derive, { kind: "derive", values: [0.255, -0.245] }).correct).toBe(true);
    expect(check(derive, { kind: "derive", values: [0.3, -0.25] }).correct).toBe(false);
    expect(check(derive, { kind: "derive", values: [NaN, 0] }).correct).toBe(false);
    expect(check(derive, { kind: "derive", values: [0.25] }).note).toMatch(/all 2/);
  });
  it("parses shapes", () => {
    expect(parseShape("(3, 4)")).toEqual([3, 4]);
    expect(parseShape("[3 4 5]")).toEqual([3, 4, 5]);
    expect(parseShape("(7,)")).toEqual([7]);
    expect(parseShape("()")).toEqual([]);
    expect(parseShape("Error")).toBeNull();
    expect(parseShape("3.5, 2")).toBeUndefined();
    expect(parseShape("abc")).toBeUndefined();
    expect(parseShape("")).toBeUndefined();
  });
});

describe("battle", () => {
  const deck = (n: number): Card[] =>
    Array.from({ length: n }, (_, i) => ({ id: `c${i}`, kind: "mcq", topic: "t", prompt: "?", explanation: "e", choices: ["a", "b"], answer: 0 }) as Card);
  const right = { kind: "mcq", choice: 0 } as const;
  const wrong = { kind: "mcq", choice: 1 } as const;

  it("streaks raise damage up to the cap and a miss resets them", () => {
    let s = startBattle(deck(10), { foeHp: 1000 });
    const dmg: number[] = [];
    for (let i = 0; i < 5; i++) {
      s = answer(s, right);
      dmg.push(s.last!.damage);
      s = next(s);
    }
    expect(dmg).toEqual([20, 25, 30, 35, 35]);
    s = answer(s, wrong);
    expect(s.streak).toBe(0);
    expect(s.playerHp).toBe(4);
    expect(s.bestStreak).toBe(5);
  });
  it("wins on a knockout and loses at zero hearts; answers after the end are ignored", () => {
    let s = startBattle(deck(20), { foeHp: 40 });
    s = answer(s, right);
    s = next(s);
    s = answer(s, right);
    expect(s.phase).toBe("won");
    expect(answer(s, wrong)).toBe(s);
    let l = startBattle(deck(20), { playerHp: 2 });
    l = answer(l, wrong);
    l = next(l);
    l = answer(l, wrong);
    expect(l.phase).toBe("lost");
    expect(summarize(l).stars).toBe(0);
  });
  it("requeues a missed card and counts first-try correctness separately", () => {
    let s = startBattle(deck(6), { foeHp: 10_000 });
    s = answer(s, wrong);
    expect(s.queue.filter((c) => c.id === "c0")).toHaveLength(1);
    expect(s.queue[3].id).toBe("c0");
    s = next(s);
    s = answer(s, right);
    expect(s.firstTryCorrect).toEqual(["c1"]);
    expect(s.missed).toEqual(["c0"]);
  });
  it("answering twice in one turn is ignored; empty deck throws", () => {
    let s = startBattle(deck(3));
    s = answer(s, right);
    expect(answer(s, wrong)).toBe(s);
    expect(() => startBattle([])).toThrow();
  });
  it("a perfect run earns 3 stars", () => {
    let s = startBattle(deck(30));
    while (s.phase === "asking" || s.phase === "feedback") s = s.phase === "asking" ? answer(s, right) : next(s);
    expect(s.phase).toBe("won");
    expect(summarize(s)).toMatchObject({ won: true, accuracy: 1, stars: 3 });
  });
  it("runs out of cards: wins on points when the foe is below half", () => {
    let s = startBattle(deck(2), { foeHp: 60 });
    s = answer(s, right);
    s = next(s);
    s = answer(s, right);
    expect(s.foeHp).toBe(15);
    s = next(s);
    expect(s.phase).toBe("won");
  });
});

describe("sample deck", () => {
  it("hand-written cards are well-formed", () => {
    for (const c of HANDWRITTEN) {
      if (c.kind === "mcq") {
        expect(c.answer).toBeGreaterThanOrEqual(0);
        expect(c.answer).toBeLessThan(c.choices.length);
      }
      if (c.kind === "multi") {
        expect(c.answers).toEqual([...c.answers].sort((a, b) => a - b));
        expect(c.answers.every((i) => i >= 0 && i < c.choices.length)).toBe(true);
        expect(c.answers.length).toBeLessThan(c.choices.length);
      }
    }
    const ids = demoDeck(1).map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(demoDeck(1)).toEqual(demoDeck(1));
    expect(demoDeck(1).map((c) => c.id)).not.toEqual(demoDeck(2).map((c) => c.id));
  });
  it("the spot-the-bug card is proven by running the code", () => {
    const run = (src: string[]) =>
      execFileSync(findPy(), ["-I", "-c", `${src.join("\n")}\nprint(softmax(np.array([1000.0, 1001.0])).tolist())`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    expect(run(SOFTMAX_BUG_SRC)).toContain("nan");
    expect(run(SOFTMAX_FIXED_SRC)).not.toContain("nan");
    const bug = HANDWRITTEN.find((c) => c.kind === "bug")!;
    if (bug.kind !== "bug") throw new Error("unreachable");
    // the fix changes exactly the line the card blames
    const diff = SOFTMAX_BUG_SRC.map((l, i) => (l === SOFTMAX_FIXED_SRC[i] ? 0 : i + 1)).filter(Boolean);
    expect(diff).toEqual([bug.line]);
  });
});
