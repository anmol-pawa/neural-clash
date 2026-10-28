import { validatePath } from "@/lib/editor/workspace";

export const SAVE_VERSION = 1;
export const MAX_LATENT_FILES = 200;
export const MAX_LATENT_BYTES = 2_000_000;

export interface Settings {
  volume: number;
  music: boolean;
  reducedMotion: boolean;
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
