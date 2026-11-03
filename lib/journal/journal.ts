/** Research journal (GDD §6): auto-logged Training Grounds experiments you can compare. Pure; no DOM. */

export interface JournalConfig {
  world: string;
  model: string;
  lr: number;
  epochs: number;
  l2: number;
  degree: number;
  batch: number;
  nTrain: number;
  noise: number;
  seed: number;
}

export interface JournalMetrics {
  /** Train accuracy (or R² for regression), 0-1. */
  train: number;
  /** Hidden-test accuracy (or R²), 0-1. */
  hidden: number;
  /** Test loss minus train loss. */
  gap: number;
  params: number;
}

export interface JournalEntry {
  id: string;
  at: number;
  config: JournalConfig;
  metrics: JournalMetrics;
  note: string;
}

export const MAX_ENTRIES = 100;
export const MAX_NOTE = 200;

const CONFIG_KEYS: (keyof JournalConfig)[] = ["world", "model", "lr", "epochs", "l2", "degree", "batch", "nTrain", "noise", "seed"];
const NUM_KEYS = CONFIG_KEYS.filter((k) => k !== "world" && k !== "model");
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Accepts only a well-formed entry; strings are truncated, numbers must be finite. */
export function sanitizeEntry(raw: unknown): JournalEntry | null {
  if (!isObj(raw) || !isObj(raw.config) || !isObj(raw.metrics)) return null;
  const c = raw.config;
  if (typeof c.world !== "string" || typeof c.model !== "string") return null;
  const config = { world: c.world.slice(0, 24), model: c.model.slice(0, 24) } as JournalConfig;
  for (const k of NUM_KEYS) {
    const v = num(c[k]);
    if (v === null) return null;
    (config as unknown as Record<string, number>)[k] = v;
  }
  const m = raw.metrics;
  const train = num(m.train), hidden = num(m.hidden), gap = num(m.gap), params = num(m.params);
  if (train === null || hidden === null || gap === null || params === null) return null;
  const at = num(raw.at) ?? 0;
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id.slice(0, 40) : `e${at}`,
    at,
    config,
    metrics: { train, hidden, gap, params },
    note: typeof raw.note === "string" ? raw.note.slice(0, MAX_NOTE) : "",
  };
}

export function sanitizeJournal(raw: unknown): JournalEntry[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: JournalEntry[] = [];
  for (const r of raw) {
    const e = sanitizeEntry(r);
    if (e && !seen.has(e.id)) {
      seen.add(e.id);
      out.push(e);
    }
  }
  return out.slice(-MAX_ENTRIES);
}

/** Appends an entry (oldest dropped beyond the cap). Returns a new array. */
export function addEntry(j: readonly JournalEntry[], e: JournalEntry): JournalEntry[] {
  return [...j.filter((x) => x.id !== e.id), e].slice(-MAX_ENTRIES);
}

export function setNote(j: readonly JournalEntry[], id: string, note: string): JournalEntry[] {
  return j.map((e) => (e.id === id ? { ...e, note: note.slice(0, MAX_NOTE) } : e));
}

export interface Comparison {
  /** Config fields whose values differ, in display order. */
  changed: (keyof JournalConfig)[];
  /** b minus a. */
  delta: { train: number; hidden: number; gap: number; params: number };
  /** Honest reading of what the comparison can and cannot tell you. */
  verdict: "identical" | "controlled" | "confounded" | "different-world";
  advice: string;
}

/** Compares run `a` (baseline) with `b`. Teaches experiment hygiene: one change at a time, same world and data. */
export function compare(a: JournalEntry, b: JournalEntry): Comparison {
  const changed = CONFIG_KEYS.filter((k) => a.config[k] !== b.config[k]);
  const delta = {
    train: b.metrics.train - a.metrics.train,
    hidden: b.metrics.hidden - a.metrics.hidden,
    gap: b.metrics.gap - a.metrics.gap,
    params: b.metrics.params - a.metrics.params,
  };
  const dataChanged = changed.filter((k) => k === "world" || k === "nTrain" || k === "noise");
  if (changed.length === 0) {
    return { changed, delta, verdict: "identical", advice: "Same configuration. Differences here would be nondeterminism, which this trainer does not have: deltas are zero." };
  }
  if (changed.includes("world")) {
    return { changed, delta, verdict: "different-world", advice: "Different worlds are different problems. Scores are not comparable; compare models within one world." };
  }
  if (changed.length === 1 && changed[0] === "seed") {
    return { changed, delta, verdict: "controlled", advice: "Only the seed changed: this measures run-to-run noise. Repeat across several seeds before trusting a small gain elsewhere." };
  }
  if (changed.length === 1) {
    return { changed, delta, verdict: "controlled", advice: `Only ${changed[0]} changed, so the difference is attributable to it (on this seed). Confirm with another seed.` };
  }
  const seedNote = changed.includes("seed") ? " The seed also changed, so noise is mixed in." : "";
  const dataNote = dataChanged.length ? " The training data changed too, so the baseline is no longer the same test." : "";
  return { changed, delta, verdict: "confounded", advice: `${changed.length} things changed at once, so you cannot tell which one caused the difference. Change one knob per run.${seedNote}${dataNote}` };
}

/** Index of the best entry by hidden score (ties: smaller gap, then earlier). -1 for empty. */
export function bestIndex(j: readonly JournalEntry[]): number {
  let best = -1;
  j.forEach((e, i) => {
    if (best < 0) best = i;
    else {
      const b = j[best];
      if (e.metrics.hidden > b.metrics.hidden || (e.metrics.hidden === b.metrics.hidden && e.metrics.gap < b.metrics.gap)) best = i;
    }
  });
  return best;
}
