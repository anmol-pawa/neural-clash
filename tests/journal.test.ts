import { describe, expect, it } from "vitest";
import { addEntry, bestIndex, compare, MAX_ENTRIES, sanitizeJournal, setNote, type JournalEntry } from "@/lib/journal/journal";
import { exportSave, freshSave, importSave, migrate } from "@/lib/save/schema";

const mk = (id: string, over: Partial<JournalEntry["config"]> = {}, hidden = 0.8, gap = 0.05): JournalEntry => ({
  id,
  at: 1,
  config: { world: "moons", model: "logistic", lr: 0.1, epochs: 100, l2: 0, degree: 1, batch: 0, nTrain: 200, noise: 0.2, seed: 7, ...over },
  metrics: { train: 0.85, hidden, gap, params: 3 },
  note: "",
});

describe("journal", () => {
  it("flags a single-knob change as controlled and names it", () => {
    const c = compare(mk("a"), mk("b", { degree: 3 }, 0.93));
    expect(c.verdict).toBe("controlled");
    expect(c.changed).toEqual(["degree"]);
    expect(c.delta.hidden).toBeCloseTo(0.13);
  });
  it("flags multi-knob changes as confounded, and data changes as such", () => {
    const c = compare(mk("a"), mk("b", { lr: 0.5, l2: 0.1, nTrain: 50 }));
    expect(c.verdict).toBe("confounded");
    expect(c.advice).toMatch(/training data changed/);
  });
  it("seed-only change measures noise; other worlds are incomparable; identical is identical", () => {
    expect(compare(mk("a"), mk("b", { seed: 8 })).advice).toMatch(/noise/);
    expect(compare(mk("a"), mk("b", { world: "line" })).verdict).toBe("different-world");
    expect(compare(mk("a"), mk("b")).verdict).toBe("identical");
  });
  it("caps entries, replaces same id, edits notes immutably", () => {
    let j: JournalEntry[] = [];
    for (let i = 0; i < MAX_ENTRIES + 5; i++) j = addEntry(j, mk(`e${i}`));
    expect(j).toHaveLength(MAX_ENTRIES);
    expect(j[0].id).toBe("e5");
    const j2 = addEntry(j, { ...mk("e50"), note: "x" });
    expect(j2).toHaveLength(MAX_ENTRIES);
    const j3 = setNote(j2, "e50", "y".repeat(500));
    expect(j3.find((e) => e.id === "e50")!.note).toHaveLength(200);
    expect(j2.find((e) => e.id === "e50")!.note).toBe("x");
  });
  it("picks the best run by hidden score then smaller gap", () => {
    expect(bestIndex([])).toBe(-1);
    expect(bestIndex([mk("a", {}, 0.8, 0.2), mk("b", {}, 0.9, 0.3), mk("c", {}, 0.9, 0.1)])).toBe(2);
  });
  it("sanitises hostile input and survives save export/import", () => {
    const bad = [null, 3, { config: {}, metrics: {} }, { ...mk("ok"), metrics: { train: NaN, hidden: 1, gap: 0, params: 1 } }, mk("good"), mk("good")];
    expect(sanitizeJournal(bad).map((e) => e.id)).toEqual(["good"]);
    expect(sanitizeJournal("nope")).toEqual([]);
    const s = { ...freshSave(), journal: [mk("x")] };
    const back = importSave(exportSave(s));
    expect(back.ok && back.save.journal.map((e) => e.id)).toEqual(["x"]);
    expect(migrate({}).journal).toEqual([]);
  });
});
