import { describe, expect, it } from "vitest";
import { buyHint, buyItem, hintCost, MART, reward, sanitizeOwned, sanitizeWallet, EMPTY_WALLET } from "@/lib/economy/economy";
import { migrate } from "@/lib/save/schema";
import { review } from "@/lib/srs/srs";

describe("rewards", () => {
  it("pays once per item and never for assisted passes", () => {
    const a = reward(EMPTY_WALLET, "lab", "x", "standard", false);
    expect(a.earned).toBe(25);
    expect(reward(a.wallet, "lab", "x", "standard", false).earned).toBe(0);
    expect(reward(EMPTY_WALLET, "lab", "y", "standard", true).earned).toBe(0);
  });
  it("interview mode pays 1.5x", () => {
    expect(reward(EMPTY_WALLET, "lab", "x", "interview", false).earned).toBe(38);
  });
});

describe("hints", () => {
  it("costs rise by rung in standard, are free in guided, off in interview", () => {
    expect([0, 1, 2, 9].map((r) => hintCost("standard", r))).toEqual([5, 10, 15, 15]);
    expect(hintCost("guided", 3)).toBe(0);
    expect(hintCost("interview", 0)).toBeNull();
  });
  it("refuses when poor or disabled and leaves the wallet unchanged", () => {
    expect(buyHint({ bits: 4, paid: [] }, "standard", 0)).toEqual({ ok: false, reason: "poor", cost: 5 });
    expect(buyHint({ bits: 99, paid: [] }, "interview", 0)).toMatchObject({ ok: false, reason: "disabled" });
    const r = buyHint({ bits: 12, paid: [] }, "standard", 1);
    expect(r.ok && r.wallet.bits).toBe(2);
  });
});

describe("mart", () => {
  it("buys once, rejects unknown, and cannot buy mastery", () => {
    const w = { bits: 100, paid: [] };
    const b = buyItem(w, [], MART[0].id);
    expect(b.ok && b.wallet.bits).toBe(40);
    expect(buyItem(w, [MART[0].id], MART[0].id)).toMatchObject({ reason: "owned" });
    expect(buyItem(w, [], "mastery")).toMatchObject({ reason: "unknown" });
    expect(buyItem({ bits: 1, paid: [] }, [], MART[0].id)).toMatchObject({ reason: "poor" });
    expect(MART.every((m) => !/mastery|srs|pass/i.test(m.id))).toBe(true);
  });
  it("spending Bits does not touch the SRS table", () => {
    const srs = review({}, "lab:x", { correct: true }, 0);
    const copy = structuredClone(srs);
    buyHint({ bits: 50, paid: [] }, "standard", 0);
    expect(srs).toEqual(copy);
  });
});

describe("sanitising and save", () => {
  it("clamps hostile wallet data", () => {
    expect(sanitizeWallet({ bits: -5, paid: [1, "a", "a"] })).toEqual({ bits: 0, paid: ["a"] });
    expect(sanitizeWallet({ bits: 1e12 }).bits).toBe(1_000_000);
    expect(sanitizeOwned(["tint-mint", "evil", 3])).toEqual(["tint-mint"]);
  });
  it("migrates old saves to standard mode with an empty wallet", () => {
    const s = migrate({ version: 1 });
    expect(s.mode).toBe("standard");
    expect(s.wallet.bits).toBe(0);
    expect(migrate({ mode: "cheat" }).mode).toBe("standard");
    expect(migrate({ mode: "interview", wallet: { bits: 7 } }).wallet.bits).toBe(7);
  });
});

import { equip, payReward, sanitizeEquipped, tintFor } from "@/lib/economy/economy";

describe("Mart equip and payReward", () => {
  it("only owned tints can be worn; decor cannot", () => {
    expect(equip([], null, "tint-ember")).toEqual({ ok: false, equipped: null });
    expect(equip(["lab-plant"], null, "lab-plant").ok).toBe(false);
    expect(equip(["tint-mint"], null, "tint-mint")).toEqual({ ok: true, equipped: "tint-mint" });
    expect(equip(["tint-mint"], "tint-mint", null)).toEqual({ ok: true, equipped: null });
  });
  it("sanitizeEquipped drops unowned or unknown ids", () => {
    expect(sanitizeEquipped("tint-ember", [])).toBeNull();
    expect(sanitizeEquipped("nope", ["nope"])).toBeNull();
    expect(sanitizeEquipped("tint-ember", ["tint-ember"])).toBe("tint-ember");
    expect(tintFor("tint-ember")?.alpha).toBeGreaterThan(0);
    expect(tintFor(null)).toBeNull();
  });
  it("payReward pays once per item, 1.5x in interview, nothing when assisted", () => {
    const s = { wallet: { bits: 0, paid: [] as string[] }, mode: "interview" as const };
    const a = payReward(s, "guardian", "g1", false);
    expect(a.earned).toBe(150);
    expect(payReward(a.state, "guardian", "g1", false)).toEqual({ state: a.state, earned: 0 });
    expect(payReward(s, "card", "c1", true).earned).toBe(0);
    expect(payReward({ ...s, mode: "standard" as const }, "card", "c1", false).state.wallet.bits).toBe(2);
  });
});
