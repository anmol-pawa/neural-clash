/**
 * Spaced mastery (GDD §6): a Leitner-style ladder over any item id (theory card, Lab module, problem).
 * Pure and deterministic: every function takes `now` (epoch ms) so tests control the clock.
 * Assisted completions never advance mastery; overdue items "rust" and need a refresher.
 */

export const DAY = 86_400_000;
/** Gap before the next review for each box. Box 0 is "just missed", so it returns within the day. */
export const INTERVALS_MS = [0.25 * DAY, 1 * DAY, 3 * DAY, 7 * DAY, 16 * DAY, 35 * DAY] as const;
export const MAX_BOX = INTERVALS_MS.length - 1;
/** Boxes at or above this count as mastered while not rusted. */
export const MASTERED_BOX = 4;

export interface SrsRecord {
  box: number;
  /** Epoch ms when the item is next due. */
  due: number;
  /** Epoch ms of the last unassisted review. */
  last: number;
  reps: number;
  lapses: number;
}

export type SrsTable = Record<string, SrsRecord>;
export type MasteryState = "new" | "learning" | "reviewing" | "mastered" | "rusted";

/** How late an item can be before it rusts: a day, or half its interval if that is longer. */
export function rustGrace(box: number): number {
  return Math.max(DAY, INTERVALS_MS[clampBox(box)] / 2);
}

const clampBox = (b: number) => Math.min(MAX_BOX, Math.max(0, Math.floor(Number.isFinite(b) ? b : 0)));

export function stateOf(rec: SrsRecord | undefined, now: number): MasteryState {
  if (!rec) return "new";
  if (now > rec.due + rustGrace(rec.box)) return "rusted";
  if (rec.box >= MASTERED_BOX) return "mastered";
  return rec.box >= 2 ? "reviewing" : "learning";
}

export const isDue = (rec: SrsRecord | undefined, now: number): boolean => rec !== undefined && now >= rec.due;

export interface ReviewInput {
  correct: boolean;
  /** Hints, a revealed reference or any other help: the review is ignored for mastery. */
  assisted?: boolean;
}

/**
 * Returns the table after one review. Correct moves up one box (a rusted item only gets back to
 * where it was, not further, so a refresher is not a free promotion); wrong halves the box.
 */
export function review(table: SrsTable, id: string, r: ReviewInput, now: number): SrsTable {
  if (r.assisted) return table;
  const prev = table[id];
  let box: number;
  let lapses = prev?.lapses ?? 0;
  if (r.correct) {
    const rusted = stateOf(prev, now) === "rusted";
    box = prev ? (rusted ? prev.box : clampBox(prev.box + 1)) : 1;
  } else {
    box = prev ? Math.floor(prev.box / 2) : 0;
    lapses += 1;
  }
  return { ...table, [id]: { box, due: now + INTERVALS_MS[box], last: now, reps: (prev?.reps ?? 0) + 1, lapses } };
}

export interface Mastery {
  counts: Record<MasteryState, number>;
  /** Share of tracked items that are mastered and not rusted, in [0, 1]. */
  mastered: number;
}

export function summarise(table: SrsTable, ids: readonly string[], now: number): Mastery {
  const counts: Record<MasteryState, number> = { new: 0, learning: 0, reviewing: 0, mastered: 0, rusted: 0 };
  for (const id of ids) counts[stateOf(table[id], now)]++;
  return { counts, mastered: ids.length ? counts.mastered / ids.length : 0 };
}

export interface DailyPlan {
  /** Due or rusted items, most overdue first. */
  reviews: string[];
  /** Never-seen items, in deck order. */
  fresh: string[];
}

/** The Daily Sync queue (GDD §6): reviews first (capped), then a small number of new items. */
export function dailyPlan(table: SrsTable, ids: readonly string[], now: number, opts: { maxReviews?: number; maxNew?: number } = {}): DailyPlan {
  const { maxReviews = 12, maxNew = 4 } = opts;
  const due = ids
    .filter((id) => isDue(table[id], now))
    .sort((a, b) => table[a].due - table[b].due || (a < b ? -1 : 1));
  const fresh = ids.filter((id) => !table[id]);
  return { reviews: due.slice(0, maxReviews), fresh: fresh.slice(0, maxNew) };
}

/** Validates a stored table; bad entries are dropped, numbers clamped. */
export function sanitizeSrs(raw: unknown): SrsTable {
  const out: SrsTable = {};
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return out;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  for (const [id, v] of Object.entries(raw).slice(0, 5000)) {
    if (typeof v !== "object" || v === null) continue;
    const r = v as Record<string, unknown>;
    const box = num(r.box), due = num(r.due), last = num(r.last), reps = num(r.reps), lapses = num(r.lapses);
    if (box === null || due === null || last === null) continue;
    out[id.slice(0, 80)] = { box: clampBox(box), due, last, reps: Math.max(0, Math.floor(reps ?? 0)), lapses: Math.max(0, Math.floor(lapses ?? 0)) };
  }
  return out;
}
