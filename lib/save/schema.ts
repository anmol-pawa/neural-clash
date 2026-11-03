import { validatePath } from "@/lib/editor/workspace";
import { sanitizeJournal, type JournalEntry } from "@/lib/journal/journal";
import { isMode, sanitizeEquipped, sanitizeOwned, sanitizeWallet, type Mode, type Wallet } from "@/lib/economy/economy";
import { sanitizeSrs, type SrsTable } from "@/lib/srs/srs";

export const SAVE_VERSION = 1;
export const MAX_LATENT_FILES = 200;
export const MAX_LATENT_BYTES = 2_000_000;

export interface Settings {
  volume: number;
  music: boolean;
  reducedMotion: boolean;
}

/** The companion the player committed from the Training Grounds: stats come from a measured hidden-set run. */
export interface CompanionRecord {
  world: string;
  attack: number;
  defence: number;
  speed: number;
  /** Hidden-test score in [0, 1] (accuracy, or R² for regression). */
  score: number;
  savedAt: number;
}

export interface SaveData {
  version: typeof SAVE_VERSION;
  /** Player name shown in dialogue. */
  name: string;
  settings: Settings;
  /** Ids of cards, lessons, battles and guardians cleared at least once. */
  cleared: string[];
  /** Lab module id -> best hidden-test pass state. */
  labs: Record<string, { passed: boolean; assisted: boolean }>;
  /** The player's `latent` framework: path -> source, mounted into Pyodide as a package. */
  latent: Record<string, string>;
  /** Null until the player saves a trained companion. */
  companion: CompanionRecord | null;
  /** Spaced-mastery records by item id (cards, labs); see `lib/srs`. */
  srs: SrsTable;
  /** Research journal: Training Grounds runs logged after the hidden-set reveal (see `lib/journal`). */
  journal: JournalEntry[];
  /** Bits balance and paid reward keys (see `lib/economy`). */
  wallet: Wallet;
  /** Mart items bought (cosmetics only). */
  owned: string[];
  /** Worn Mart tint id (must be owned), or null. */
  equipped: string | null;
  /** Scaffolding mode: how many hints the game offers. */
  mode: Mode;
  /** Free-form per-system state owned by later features (SRS, journal), kept opaque here. */
  extra: Record<string, unknown>;
  updatedAt: number;
}

export const DEFAULT_SAVE: SaveData = {
  version: SAVE_VERSION,
  name: "Trainer",
  settings: { volume: 0.6, music: true, reducedMotion: false },
  cleared: [],
  labs: {},
  latent: {},
  companion: null,
  srs: {},
  journal: [],
  wallet: { bits: 0, paid: [] },
  owned: [],
  equipped: null,
  mode: "standard",
  extra: {},
  updatedAt: 0,
};

export const freshSave = (): SaveData => structuredClone(DEFAULT_SAVE);

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Keeps only safe `.py` paths and string contents, within size limits. */
export function sanitizeLatent(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!isObj(raw)) return out;
  let bytes = 0;
  for (const [path, src] of Object.entries(raw)) {
    if (Object.keys(out).length >= MAX_LATENT_FILES) break;
    if (typeof src !== "string" || validatePath(path) !== null || !path.endsWith(".py")) continue;
    if (bytes + src.length > MAX_LATENT_BYTES) continue;
    bytes += src.length;
    out[path] = src;
  }
  return out;
}

const pct = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? Math.round(Math.min(100, Math.max(0, v))) : null);

/** Accepts only a well-formed companion record; stats are clamped to 0-100 integers. */
export function sanitizeCompanion(raw: unknown): CompanionRecord | null {
  if (!isObj(raw) || typeof raw.world !== "string") return null;
  const attack = pct(raw.attack);
  const defence = pct(raw.defence);
  const speed = pct(raw.speed);
  if (attack === null || defence === null || speed === null) return null;
  const score = typeof raw.score === "number" && Number.isFinite(raw.score) ? Math.min(1, Math.max(0, raw.score)) : 0;
  const savedAt = typeof raw.savedAt === "number" && Number.isFinite(raw.savedAt) ? raw.savedAt : 0;
  return { world: raw.world.slice(0, 24), attack, defence, speed, score, savedAt };
}

/** Builds a valid SaveData from anything: unknown input, older versions, partial or hostile data. */
export function migrate(raw: unknown): SaveData {
  const base = freshSave();
  if (!isObj(raw)) return base;
  const s = isObj(raw.settings) ? raw.settings : {};
  const labs: SaveData["labs"] = {};
  if (isObj(raw.labs)) {
    for (const [id, v] of Object.entries(raw.labs)) {
      if (isObj(v)) labs[id] = { passed: v.passed === true, assisted: v.assisted === true };
    }
  }
  const volume = typeof s.volume === "number" && Number.isFinite(s.volume) ? Math.min(1, Math.max(0, s.volume)) : base.settings.volume;
  return {
    version: SAVE_VERSION,
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim().slice(0, 16) : base.name,
    settings: {
      volume,
      music: typeof s.music === "boolean" ? s.music : base.settings.music,
      reducedMotion: typeof s.reducedMotion === "boolean" ? s.reducedMotion : base.settings.reducedMotion,
    },
    cleared: Array.isArray(raw.cleared) ? [...new Set(raw.cleared.filter((x): x is string => typeof x === "string"))] : [],
    labs,
    latent: sanitizeLatent(raw.latent),
    companion: sanitizeCompanion(raw.companion),
    srs: sanitizeSrs(raw.srs),
    journal: sanitizeJournal(raw.journal),
    wallet: sanitizeWallet(raw.wallet),
    owned: sanitizeOwned(raw.owned),
    equipped: sanitizeEquipped(raw.equipped, sanitizeOwned(raw.owned)),
    mode: isMode(raw.mode) ? raw.mode : base.mode,
    extra: isObj(raw.extra) ? { ...raw.extra } : {},
    updatedAt: typeof raw.updatedAt === "number" && Number.isFinite(raw.updatedAt) ? raw.updatedAt : 0,
  };
}

const FORMAT = "neural-clash-save";

/** Portable export: a JSON string with a format tag, so import can reject unrelated files. */
export function exportSave(s: SaveData): string {
  return JSON.stringify({ format: FORMAT, version: SAVE_VERSION, data: s }, null, 1);
}

export type ImportResult = { ok: true; save: SaveData } | { ok: false; error: string };

export function importSave(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file is not valid JSON." };
  }
  if (!isObj(parsed) || parsed.format !== FORMAT) return { ok: false, error: "That is not a Neural Clash save file." };
  if (typeof parsed.version === "number" && parsed.version > SAVE_VERSION) {
    return { ok: false, error: "This save is from a newer version of the game." };
  }
  return { ok: true, save: migrate(parsed.data) };
}

/** Files to mount as the `latent` package: the player's, or the reference (marked assisted). */
export function latentMount(s: SaveData, reference: Record<string, string> | null): { files: Record<string, string>; assisted: boolean } {
  return reference ? { files: { ...s.latent, ...reference }, assisted: true } : { files: { ...s.latent }, assisted: false };
}
