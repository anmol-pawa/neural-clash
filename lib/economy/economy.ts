/**
 * Bits and scaffolding modes (GDD §6). Bits buy hints and cosmetics, never mastery:
 * nothing here touches the SRS table, and a hint taken on an item marks that item assisted.
 * Pure: no clock, no DOM.
 */

export type Mode = "guided" | "standard" | "interview";
export const MODES: readonly Mode[] = ["guided", "standard", "interview"];

export interface ModeInfo {
  id: Mode;
  label: string;
  blurb: string;
  /** Bits for hint rung 1, 2, 3... (the last value repeats). Empty means hints are off. */
  hintCosts: readonly number[];
}

export const MODE_INFO: Record<Mode, ModeInfo> = {
  guided: { id: "guided", label: "Guided", blurb: "Hints are free. Taking one marks the item assisted.", hintCosts: [0] },
  standard: { id: "standard", label: "Standard", blurb: "Hints cost Bits and get dearer each rung. Taking one marks the item assisted.", hintCosts: [5, 10, 15] },
  interview: { id: "interview", label: "Interview", blurb: "No hints, like the real round. Bits are earned at 1.5x.", hintCosts: [] },
};

export const isMode = (v: unknown): v is Mode => typeof v === "string" && (MODES as readonly string[]).includes(v);

export interface Wallet {
  bits: number;
  /** Reward keys already paid, so a pass cannot be farmed by replaying. */
  paid: string[];
}

export const EMPTY_WALLET: Wallet = { bits: 0, paid: [] };
export const MAX_BITS = 1_000_000;
export const MAX_PAID = 2000;

export type RewardKind = "card" | "lab" | "guardian" | "problem";
const BASE_REWARD: Record<RewardKind, number> = { card: 2, lab: 25, guardian: 100, problem: 40 };

/** Bits for a first, unassisted success. Replays and assisted passes pay nothing. */
export function reward(w: Wallet, kind: RewardKind, id: string, mode: Mode, assisted: boolean): { wallet: Wallet; earned: number } {
  const key = `${kind}:${id}`;
  if (assisted || w.paid.includes(key)) return { wallet: w, earned: 0 };
  const earned = Math.round(BASE_REWARD[kind] * (mode === "interview" ? 1.5 : 1));
  const paid = [...w.paid, key].slice(-MAX_PAID);
  return { wallet: { bits: Math.min(MAX_BITS, w.bits + earned), paid }, earned };
}

/** Price of the next hint rung (0-based), or null when this mode offers no hints. */
export function hintCost(mode: Mode, rung: number): number | null {
  const costs = MODE_INFO[mode].hintCosts;
  if (!costs.length) return null;
  return costs[Math.min(Math.max(0, Math.floor(rung)), costs.length - 1)];
}

export type SpendResult = { ok: true; wallet: Wallet; cost: number } | { ok: false; reason: "disabled" | "poor"; cost: number | null };

/** Buys the next hint rung. Fails without changing the wallet when hints are off or Bits are short. */
export function buyHint(w: Wallet, mode: Mode, rung: number): SpendResult {
  const cost = hintCost(mode, rung);
  if (cost === null) return { ok: false, reason: "disabled", cost };
  if (w.bits < cost) return { ok: false, reason: "poor", cost };
  return { ok: true, wallet: { ...w, bits: w.bits - cost }, cost };
}

export interface MartItem {
  id: string;
  name: string;
  blurb: string;
  cost: number;
}

/** Cosmetics only. Nothing sold here changes grading, mastery or evolution. */
export const MART: readonly MartItem[] = [
  { id: "tint-ember", name: "Ember tint", blurb: "Warm orange palette swap for your Pup.", cost: 60 },
  { id: "tint-mint", name: "Mint tint", blurb: "Cool green palette swap for your Pup.", cost: 60 },
  { id: "lab-plant", name: "Lab fern", blurb: "A potted fern for your Forge.", cost: 40 },
  { id: "lab-poster", name: "Loss-curve poster", blurb: "A framed curve that only goes down.", cost: 80 },
];

export type PurchaseResult = { ok: true; wallet: Wallet; owned: string[] } | { ok: false; reason: "unknown" | "owned" | "poor" };

export function buyItem(w: Wallet, owned: readonly string[], itemId: string): PurchaseResult {
  const item = MART.find((m) => m.id === itemId);
  if (!item) return { ok: false, reason: "unknown" };
  if (owned.includes(itemId)) return { ok: false, reason: "owned" };
  if (w.bits < item.cost) return { ok: false, reason: "poor" };
  return { ok: true, wallet: { ...w, bits: w.bits - item.cost }, owned: [...owned, itemId] };
}

export function sanitizeWallet(raw: unknown): Wallet {
  if (typeof raw !== "object" || raw === null) return { ...EMPTY_WALLET };
  const r = raw as Record<string, unknown>;
  const bits = typeof r.bits === "number" && Number.isFinite(r.bits) ? Math.min(MAX_BITS, Math.max(0, Math.floor(r.bits))) : 0;
  const paid = Array.isArray(r.paid) ? [...new Set(r.paid.filter((x): x is string => typeof x === "string" && x.length <= 80))].slice(-MAX_PAID) : [];
  return { bits, paid };
}

export function sanitizeOwned(raw: unknown): string[] {
  return Array.isArray(raw) ? [...new Set(raw.filter((x): x is string => typeof x === "string" && MART.some((m) => m.id === x)))] : [];
}

/** A tint recolours the opaque pixels of the Pup: `rgb` blended in at `alpha` (source-atop). */
export interface Tint {
  rgb: string;
  alpha: number;
}

const TINTS: Record<string, Tint> = {
  "tint-ember": { rgb: "255,140,40", alpha: 0.38 },
  "tint-mint": { rgb: "60,220,160", alpha: 0.36 },
};

/** Items that can be worn by the Pup (the others are Forge decor). */
export const isTintItem = (id: string): boolean => id in TINTS;

export const tintFor = (equipped: string | null): Tint | null => (equipped && TINTS[equipped]) || null;

/** Wears an owned tint, or `null` to take it off. Unowned or non-tint ids are refused. */
export function equip(owned: readonly string[], equipped: string | null, itemId: string | null): { ok: boolean; equipped: string | null } {
  if (itemId === null) return { ok: true, equipped: null };
  if (!owned.includes(itemId) || !isTintItem(itemId)) return { ok: false, equipped };
  return { ok: true, equipped: itemId };
}

/** Only an owned tint stays equipped (hostile or edited saves fall back to none). */
export function sanitizeEquipped(raw: unknown, owned: readonly string[]): string | null {
  return typeof raw === "string" && isTintItem(raw) && owned.includes(raw) ? raw : null;
}

/** Pays `reward` into any state carrying a wallet and a mode (the save). Returns the same object when nothing is earned. */
export function payReward<T extends { wallet: Wallet; mode: Mode }>(s: T, kind: RewardKind, id: string, assisted: boolean): { state: T; earned: number } {
  const r = reward(s.wallet, kind, id, s.mode, assisted);
  return r.earned === 0 ? { state: s, earned: 0 } : { state: { ...s, wallet: r.wallet }, earned: r.earned };
}
