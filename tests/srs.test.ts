import { describe, expect, it } from "vitest";
import { DAY, dailyPlan, review, rustGrace, sanitizeSrs, stateOf, summarise, type SrsTable } from "@/lib/srs/srs";
import { migrate } from "@/lib/save/schema";

const T0 = 1_000_000_000_000;

describe("review ladder", () => {
  it("climbs one box per correct review and schedules by interval", () => {
    let t: SrsTable = {};
    t = review(t, "a", { correct: true }, T0);
    expect(t.a.box).toBe(1);
    expect(t.a.due).toBe(T0 + DAY);
    t = review(t, "a", { correct: true }, T0 + DAY);
    expect(t.a.box).toBe(2);
    expect(t.a.due).toBe(T0 + DAY + 3 * DAY);
  });
  it("caps at the top box", () => {
    let t: SrsTable = { a: { box: 5, due: T0, last: T0 - DAY, reps: 9, lapses: 0 } };
    t = review(t, "a", { correct: true }, T0);
    expect(t.a.box).toBe(5);
  });
  it("halves the box and counts a lapse on a miss; a first-time miss stays in box 0", () => {
    let t = review({}, "a", { correct: false }, T0);
    expect(t.a).toMatchObject({ box: 0, lapses: 1 });
    t = { b: { box: 4, due: T0, last: T0, reps: 4, lapses: 0 } };
    t = review(t, "b", { correct: false }, T0);
    expect(t.b).toMatchObject({ box: 2, lapses: 1 });
  });
  it("ignores assisted reviews entirely", () => {
    const t: SrsTable = {};
    expect(review(t, "a", { correct: true, assisted: true }, T0)).toBe(t);
    const t2: SrsTable = { a: { box: 2, due: T0, last: T0, reps: 2, lapses: 0 } };
    expect(review(t2, "a", { correct: false, assisted: true }, T0)).toBe(t2);
  });
  it("does not mutate the input", () => {
    const t: SrsTable = {};
    review(t, "a", { correct: true }, T0);
    expect(t).toEqual({});
  });
});

describe("rust and states", () => {
  const rec = (box: number, due: number) => ({ box, due, last: due - DAY, reps: 3, lapses: 0 });
  it("classifies states by box and lateness", () => {
    expect(stateOf(undefined, T0)).toBe("new");
    expect(stateOf(rec(1, T0 + DAY), T0)).toBe("learning");
    expect(stateOf(rec(3, T0 + DAY), T0)).toBe("reviewing");
    expect(stateOf(rec(5, T0 + DAY), T0)).toBe("mastered");
  });
  it("rusts only after the grace period, which grows with the interval", () => {
    const r = rec(5, T0);
    expect(rustGrace(5)).toBeGreaterThan(rustGrace(1));
    expect(stateOf(r, T0 + rustGrace(5))).toBe("mastered");
    expect(stateOf(r, T0 + rustGrace(5) + 1)).toBe("rusted");
  });
  it("a correct refresher on a rusted item restores its box without promoting it", () => {
    const t: SrsTable = { a: rec(4, T0) };
    const later = T0 + 100 * DAY;
    expect(stateOf(t.a, later)).toBe("rusted");
    const after = review(t, "a", { correct: true }, later);
    expect(after.a.box).toBe(4);
    expect(stateOf(after.a, later)).toBe("mastered");
  });
});

describe("daily plan and summary", () => {
  it("orders reviews most-overdue first, caps both lists, leaves not-yet-due items out", () => {
    const t: SrsTable = {
      a: { box: 1, due: T0 - 2 * DAY, last: 0, reps: 1, lapses: 0 },
      b: { box: 1, due: T0 - 5 * DAY, last: 0, reps: 1, lapses: 0 },
      c: { box: 1, due: T0 + DAY, last: 0, reps: 1, lapses: 0 },
    };
    const p = dailyPlan(t, ["a", "b", "c", "n1", "n2", "n3"], T0, { maxReviews: 1, maxNew: 2 });
    expect(p.reviews).toEqual(["b"]);
    expect(p.fresh).toEqual(["n1", "n2"]);
    expect(dailyPlan(t, ["c"], T0)).toEqual({ reviews: [], fresh: [] });
  });
  it("summarises counts and the mastered share", () => {
    const t: SrsTable = { a: { box: 5, due: T0 + DAY, last: T0, reps: 5, lapses: 0 } };
    const m = summarise(t, ["a", "b"], T0);
    expect(m.counts).toMatchObject({ mastered: 1, new: 1 });
    expect(m.mastered).toBe(0.5);
    expect(summarise({}, [], T0).mastered).toBe(0);
  });
});

describe("persistence", () => {
  it("drops malformed entries and clamps numbers", () => {
    const t = sanitizeSrs({ ok: { box: 99, due: 5, last: 1, reps: -2, lapses: 1.7 }, bad: { box: "x" }, worse: 3 });
    expect(Object.keys(t)).toEqual(["ok"]);
    expect(t.ok).toEqual({ box: 5, due: 5, last: 1, reps: 0, lapses: 1 });
    expect(sanitizeSrs([1, 2])).toEqual({});
  });
  it("round-trips through the save and defaults to empty", () => {
    expect(migrate({}).srs).toEqual({});
    const srs = review({}, "a", { correct: true }, T0);
    expect(migrate({ srs }).srs).toEqual(srs);
  });
});
