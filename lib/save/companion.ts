/** The companion's last committed stats live in `save.extra.companion` (opaque to the schema, sanitised here). */
import type { CompanionStats } from "@/lib/labs/companion";
import type { SaveData } from "./schema";

export interface SavedCompanion {
  stats: CompanionStats;
  /** Which world and settings produced them, for the journal. */
  world: string;
  won: boolean;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const stat = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : null);

export function readCompanion(s: SaveData): SavedCompanion | null {
  const c = s.extra.companion;
  if (!isObj(c) || !isObj(c.stats)) return null;
  const attack = stat(c.stats.attack);
  const defence = stat(c.stats.defence);
  const speed = stat(c.stats.speed);
  if (attack === null || defence === null || speed === null) return null;
  return { stats: { attack, defence, speed }, world: typeof c.world === "string" ? c.world.slice(0, 24) : "", won: c.won === true };
}

/** Keeps the better committed companion (by attack + defence + speed), so a worse run never erases progress. */
export function commitCompanion(s: SaveData, next: SavedCompanion): SaveData {
  const total = (c: SavedCompanion) => c.stats.attack + c.stats.defence + c.stats.speed;
  const prev = readCompanion(s);
  if (prev && total(prev) > total(next)) return s;
  return { ...s, extra: { ...s.extra, companion: next } };
}
