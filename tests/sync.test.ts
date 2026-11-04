import { describe, expect, it } from "vitest";
import type { Card } from "@/lib/cards/types";
import { DAY, review, type SrsTable } from "@/lib/srs/srs";
import { buildSync, labKey, problemKey, rustLevel, staleLabIds, syncCards } from "@/lib/sync/sync";

const card = (id: string): Card => ({ id, kind: "mcq", topic: "t", prompt: "p", explanation: "e", choices: ["a", "b"], answer: 0 });
const decks = [
  { id: "d1", title: "One", cards: [card("a"), card("b"), card("c")] },
  { id: "d2", title: "Two", cards: [card("c"), card("d")] },
];
const labs = [{ id: "L1", title: "Lab one" }, { id: "L2", title: "Lab two" }];
const T0 = 1_000_000_000_000;

function seeded(): SrsTable {
  let t: SrsTable = {};
  t = review(t, "a", { correct: true }, T0); // box 1, due +1d
  t = review(t, "b", { correct: true }, T0);
  t = review(t, "b", { correct: true }, T0 + 1 * DAY); // box 2, due +3d after that
  t = review(t, labKey("L1"), { correct: true }, T0);
  return t;
}

describe("buildSync", () => {
  it("is all new on an empty table", () => {
    const s = buildSync({}, decks, labs, T0);
    expect(s.plan.reviews).toEqual([]);
    expect(s.plan.fresh).toEqual(["a", "b", "c", "d"]);
    expect(s.labs).toEqual([]);
    expect(s.rustLevel).toBe(0);
    expect(s.trackedCount).toBe(0);
  });

  it("queues due items and dedupes a card shared by two decks", () => {
    const now = T0 + 2 * DAY; // a and L1 are due; b is not (due T0+4d)
    const s = buildSync(seeded(), decks, labs, now);
    expect(s.plan.reviews).toEqual(["a"]);
    expect(s.plan.fresh).toEqual(["c", "d"]);
    expect(s.labs.map((l) => l.id)).toEqual(["L1"]);
    expect(s.decks[0].total).toBe(3);
    expect(syncCards(s.plan, decks).map((c) => c.id)).toEqual(["a", "c", "d"]);
  });

  it("marks long-overdue Labs stale and raises the rust level", () => {
    const now = T0 + 20 * DAY;
    const t = seeded();
    expect(staleLabIds(t, labs, now)).toEqual(new Set(["L1"]));
    const s = buildSync(t, decks, labs, now);
    expect(s.labs[0]).toEqual({ id: "L1", title: "Lab one", stale: true });
    expect(s.rustedCount).toBe(3);
    expect(s.rustLevel).toBe(1);
  });

  it("a Lab that is due but within grace is not stale", () => {
    const s = buildSync(seeded(), decks, labs, T0 + 1.5 * DAY);
    expect(s.labs).toEqual([{ id: "L1", title: "Lab one", stale: false }]);
  });

  it("rust level ignores untracked items and is a share", () => {
    const t = seeded();
    expect(rustLevel(t, ["a", "zzz"], T0 + 30 * DAY)).toBe(1);
    expect(rustLevel(t, ["a", "b"], T0 + 1.9 * DAY)).toBe(0);
    expect(rustLevel(t, ["a", "b"], T0 + 2.9 * DAY)).toBe(0.5);
  });

  it("respects the review cap", () => {
    let t: SrsTable = {};
    for (const id of ["a", "b", "c"]) t = review(t, id, { correct: true }, T0);
    const s = buildSync(t, decks, [], T0 + 2 * DAY, { maxReviews: 2, maxNew: 0 });
    expect(s.plan.reviews).toHaveLength(2);
    expect(s.plan.fresh).toEqual([]);
  });

  it("tracks Dojo problems: due, stale, and counted towards rust", () => {
    const problems = [{ id: "P1", title: "Problem one" }, { id: "P2", title: "Problem two" }];
    const t = review({}, problemKey("P1"), { correct: true }, T0);
    expect(problemKey("P1")).toBe("dojo:P1");
    expect(buildSync(t, decks, labs, T0, {}, problems).problems).toEqual([]);
    const due = buildSync(t, decks, labs, T0 + 1.5 * DAY, {}, problems);
    expect(due.problems).toEqual([{ id: "P1", title: "Problem one", stale: false }]);
    const old = buildSync(t, decks, labs, T0 + 30 * DAY, {}, problems);
    expect(old.problems[0].stale).toBe(true);
    expect(old.trackedCount).toBe(1);
    expect(old.rustedCount).toBe(1);
  });

  it("assisted solves do not create a problem record", () => {
    const t = review({}, problemKey("P1"), { correct: true, assisted: true }, T0);
    expect(t).toEqual({});
  });
});
