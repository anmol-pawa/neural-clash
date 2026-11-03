import { describe, expect, it } from "vitest";
import { companionStats } from "@/lib/labs/companion";
import { MAX_ROUNDS, fightOverfit, foeDamage, hitDamage } from "@/lib/train/revealBattle";
import { makeSplit } from "@/lib/train/datasets";
import { companionMetrics, train } from "@/lib/train/linear";

describe("reveal battle", () => {
  it("is deterministic", () => {
    const s = { attack: 70, defence: 60, speed: 80 };
    expect(fightOverfit(s)).toEqual(fightOverfit(s));
  });
  it("damage rises with attack and falls with defence", () => {
    expect(hitDamage(100)).toBeGreaterThan(hitDamage(0));
    expect(foeDamage(100)).toBeLessThan(foeDamage(0));
    expect(foeDamage(100)).toBeGreaterThanOrEqual(1);
    expect(hitDamage(NaN)).toBe(hitDamage(0));
  });
  it("a strong generaliser wins, a memoriser with no defence loses", () => {
    expect(fightOverfit({ attack: 95, defence: 90, speed: 80 }).won).toBe(true);
    expect(fightOverfit({ attack: 20, defence: 5, speed: 80 }).won).toBe(false);
  });
  it("speed decides who strikes first and can flip a close fight", () => {
    const fast = fightOverfit({ attack: 40, defence: 40, speed: 90 });
    expect(fast.events[0].actor).toBe("you");
    expect(fightOverfit({ attack: 40, defence: 40, speed: 10 }).events[0].actor).toBe("foe");
  });
  it("event log is consistent and the fight ends", () => {
    const r = fightOverfit({ attack: 50, defence: 50, speed: 50 });
    const last = r.events[r.events.length - 1];
    expect(last.youHp).toBe(r.youHp);
    expect(last.foeHp).toBe(r.foeHp);
    expect(r.won).toBe(r.foeHp === 0 && r.youHp > 0);
    expect(r.rounds).toBeLessThanOrEqual(MAX_ROUNDS);
  });
  it("lesson names the weakest stat", () => {
    expect(fightOverfit({ attack: 90, defence: 10, speed: 90 }).lesson).toMatch(/Defence/);
    expect(fightOverfit({ attack: 10, defence: 90, speed: 90 }).lesson).toMatch(/Attack/);
    expect(fightOverfit({ attack: 90, defence: 90, speed: 10 }).lesson).toMatch(/Speed/);
  });
  it("measured models: degree-2 on XOR beats a straight line, end to end", () => {
    const split = makeSplit("xor", 80, 400, 0.35, 7);
    const run = (degree: number) => {
      const fit = train(split.train, { model: "logistic", lr: 0.3, epochs: 200, l2: 0, degree, batchSize: 0, seed: 7 });
      return fightOverfit(companionStats(companionMetrics(fit, split.train, split.test)));
    };
    expect(run(2).won).toBe(true);
    expect(run(1).won).toBe(false);
  });
});
