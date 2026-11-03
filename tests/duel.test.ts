import { describe, expect, it } from "vitest";
import { companionStats } from "@/lib/labs/companion";
import { companionHit, foeHit, OVERFIT_MINION, simulateDuel } from "@/lib/train/duel";
import { commitCompanion, readCompanion } from "@/lib/save/companion";
import { freshSave, migrate } from "@/lib/save/schema";

describe("duel", () => {
  it("is deterministic", () => {
    const s = { attack: 80, defence: 70, speed: 90 };
    expect(simulateDuel(s)).toEqual(simulateDuel(s));
  });
  it("hit tables are monotone in the right direction", () => {
    expect(companionHit(100)).toBeGreaterThan(companionHit(10));
    expect(foeHit(100)).toBeLessThan(foeHit(0));
    expect(companionHit(0)).toBeGreaterThanOrEqual(1);
    expect(foeHit(100)).toBeGreaterThanOrEqual(1);
  });
  it("a model that generalises beats the minion", () => {
    const good = companionStats({ r2: 0.95, generalisationGap: 0.01, params: 6 });
    const r = simulateDuel(good);
    expect(r.won).toBe(true);
    expect(r.ending).toBe("ko");
    expect(r.companionHp).toBeGreaterThan(0);
  });
  it("a memoriser with the same attack loses where the generaliser wins", () => {
    const gen = companionStats({ r2: 0.9, generalisationGap: 0.0, params: 6 });
    const mem = companionStats({ r2: 0.9, generalisationGap: 0.5, params: 6 });
    expect(gen.attack).toBe(mem.attack);
    expect(simulateDuel(gen).won).toBe(true);
    expect(simulateDuel(mem).won).toBe(false);
  });
  it("a model no better than the mean (attack 0) cannot win", () => {
    const r = simulateDuel({ attack: 0, defence: 100, speed: 100 });
    expect(r.won).toBe(false);
  });
  it("speed decides who strikes first, and first strike can be the whole fight", () => {
    const fast = simulateDuel({ attack: 50, defence: 50, speed: 100 });
    const slow = simulateDuel({ attack: 50, defence: 50, speed: 0 });
    expect(fast.firstStrike).toBe("companion");
    expect(slow.firstStrike).toBe("foe");
    expect(fast.events[0].actor).toBe("companion");
    expect(slow.events[0].actor).toBe("foe");
    expect(fast.companionHp).toBeGreaterThanOrEqual(slow.companionHp);
  });
  it("a stalemate ends in a timeout, not an endless loop", () => {
    const r = simulateDuel({ attack: 0, defence: 100, speed: 0 }, { ...OVERFIT_MINION, hp: 10000, armour: 0, hit: 1 });
    expect(r.ending).toBe("timeout");
    expect(r.rounds).toBeLessThanOrEqual(40);
  });
  it("event HP never goes below zero and is consistent", () => {
    const r = simulateDuel({ attack: 60, defence: 20, speed: 10 });
    for (const e of r.events) {
      expect(e.companionHp).toBeGreaterThanOrEqual(0);
      expect(e.foeHp).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("saved companion", () => {
  const mk = (a: number, d: number, s: number, won = true) => ({ stats: { attack: a, defence: d, speed: s }, world: "xor", won });
  it("round-trips through migrate", () => {
    const s = commitCompanion(freshSave(), mk(90, 80, 70));
    expect(readCompanion(migrate(JSON.parse(JSON.stringify(s))))).toEqual(mk(90, 80, 70));
  });
  it("a worse run does not erase a better companion", () => {
    const s = commitCompanion(freshSave(), mk(90, 80, 70));
    expect(readCompanion(commitCompanion(s, mk(10, 10, 10, false)))?.stats.attack).toBe(90);
    expect(readCompanion(commitCompanion(s, mk(95, 90, 70)))?.stats.attack).toBe(95);
  });
  it("hostile data reads as null", () => {
    const s = { ...freshSave(), extra: { companion: { stats: { attack: "x", defence: 1, speed: 1 } } } };
    expect(readCompanion(s)).toBeNull();
    expect(readCompanion({ ...freshSave(), extra: { companion: 5 } })).toBeNull();
  });
});
