/**
 * Daily Sync planning (GDD §6). Pure: combines the SRS table with the card decks and Lab list into
 * today's queue, a mastery summary, which Labs are "stale" and how rusty the companion looks.
 */
import type { Card } from "@/lib/cards/types";
import { dailyPlan, isDue, stateOf, summarise, type DailyPlan, type Mastery, type SrsTable } from "@/lib/srs/srs";

export interface SyncDeck {
  id: string;
  title: string;
  cards: readonly Card[];
}

export interface SyncLab {
  id: string;
  title: string;
}

export const labKey = (labId: string): string => `lab:${labId}`;
/** SRS id for a Code Dojo problem; written when the problem is solved unaided. */
export const problemKey = (problemId: string): string => `problem:${problemId}`;

export interface DeckSummary {
  id: string;
  title: string;
  total: number;
  mastery: Mastery;
}

export interface SyncState {
  plan: DailyPlan;
  decks: DeckSummary[];
  /** Labs whose spaced review is due, most overdue first. `stale` ones have also rusted. */
  labs: { id: string; title: string; stale: boolean }[];
  /** Code Dojo problems whose spaced review is due, most overdue first. */
  problems: { id: string; title: string; stale: boolean }[];
  /** Every tracked item that has rusted (cards and Labs). */
  rustedCount: number;
  trackedCount: number;
  /** 0 (shiny) to 1 (every tracked item rusted): drives the companion's rust overlay. */
  rustLevel: number;
}

/** Labs that were passed but are overdue past their grace period ("stale", GDD §6). */
export function staleLabIds(table: SrsTable, labs: readonly SyncLab[], now: number): Set<string> {
  return new Set(labs.filter((l) => stateOf(table[labKey(l.id)], now) === "rusted").map((l) => l.id));
}

/**
 * Companion rust: the share of tracked items that have rusted, capped so one stale item never
 * paints the sprite fully brown. Untracked items do not count either way.
 */
export function rustLevel(table: SrsTable, ids: readonly string[], now: number): number {
  let tracked = 0, rusted = 0;
  for (const id of ids) {
    if (!table[id]) continue;
    tracked++;
    if (stateOf(table[id], now) === "rusted") rusted++;
  }
  return tracked === 0 ? 0 : rusted / tracked;
}

export function buildSync(table: SrsTable, decks: readonly SyncDeck[], labs: readonly SyncLab[], now: number, opts: { maxReviews?: number; maxNew?: number; problems?: readonly SyncLab[] } = {}): SyncState {
  // A card id can appear in several decks only by mistake; the first deck wins.
  const seen = new Set<string>();
  const cardIds: string[] = [];
  for (const d of decks) for (const c of d.cards) if (!seen.has(c.id)) { seen.add(c.id); cardIds.push(c.id); }
  const labIds = labs.map((l) => labKey(l.id));
  const problems = opts.problems ?? [];
  const all = [...cardIds, ...labIds, ...problems.map((p) => problemKey(p.id))];
  const stale = staleLabIds(table, labs, now);
  const dueLabs = labs
    .filter((l) => isDue(table[labKey(l.id)], now))
    .sort((a, b) => table[labKey(a.id)].due - table[labKey(b.id)].due || (a.id < b.id ? -1 : 1))
    .map((l) => ({ id: l.id, title: l.title, stale: stale.has(l.id) }));
  const dueProblems = problems
    .filter((p) => isDue(table[problemKey(p.id)], now))
    .sort((a, b) => table[problemKey(a.id)].due - table[problemKey(b.id)].due || (a.id < b.id ? -1 : 1))
    .map((p) => ({ id: p.id, title: p.title, stale: stateOf(table[problemKey(p.id)], now) === "rusted" }));
  const tracked = all.filter((id) => table[id]);
  return {
    plan: dailyPlan(table, cardIds, now, opts),
    decks: decks.map((d) => ({ id: d.id, title: d.title, total: d.cards.length, mastery: summarise(table, d.cards.map((c) => c.id), now) })),
    labs: dueLabs,
    problems: dueProblems,
    rustedCount: tracked.filter((id) => stateOf(table[id], now) === "rusted").length,
    trackedCount: tracked.length,
    rustLevel: rustLevel(table, all, now),
  };
}

/** Today's cards in order: due reviews first, then new ones. Ids missing from the decks are skipped. */
export function syncCards(plan: DailyPlan, decks: readonly SyncDeck[]): Card[] {
  const byId = new Map<string, Card>();
  for (const d of decks) for (const c of d.cards) if (!byId.has(c.id)) byId.set(c.id, c);
  return [...plan.reviews, ...plan.fresh].flatMap((id) => byId.get(id) ?? []);
}
