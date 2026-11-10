/**
 * Pure logic for the Data Dojo interactives (GDD 5.4): cost-matrix threshold tuning, split leakage, A/B peeking.
 * Everything is seeded and deterministic so the UI numbers are testable.
 */
import { rng } from "@/lib/cards/rng";

function gauss(u: () => number): number {
  return Math.sqrt(-2 * Math.log(1 - u())) * Math.cos(2 * Math.PI * u());
}
const sigmoid = (z: number): number => 1 / (1 + Math.exp(-z));

/* ---------- 1. Confusion matrix and cost-matrix thresholds ---------- */

export interface Scored { score: number; label: 0 | 1 }
export interface Counts { tp: number; fp: number; fn: number; tn: number }
export interface CostMatrix { fp: number; fn: number }

/** A scored population: the positive class is `prevalence` of rows; positive logits sit `separation` above negatives (unit-variance normals). */
export function scoredPopulation(n: number, prevalence: number, separation: number, seed = 5): Scored[] {
  const u = rng(seed);
  const out: Scored[] = [];
  for (let i = 0; i < n; i++) {
    const label: 0 | 1 = u() < prevalence ? 1 : 0;
    out.push({ score: sigmoid(gauss(u) + (label ? separation / 2 : -separation / 2)), label });
  }
  return out;
}

/** Flag a row when `score >= t` (so t = Infinity flags nothing). */
export function confusionAt(pop: readonly Scored[], t: number): Counts {
  const c: Counts = { tp: 0, fp: 0, fn: 0, tn: 0 };
  for (const r of pop) {
    const flag = r.score >= t;
    if (flag) r.label ? c.tp++ : c.fp++;
    else r.label ? c.fn++ : c.tn++;
  }
  return c;
}

export const costOf = (c: Counts, m: CostMatrix): number => c.fp * m.fp + c.fn * m.fn;
export const accuracyOf = (c: Counts): number => (c.tp + c.tn) / (c.tp + c.fp + c.fn + c.tn);

/** Cost-minimising threshold over every distinct score plus "flag nothing"; ties keep the higher threshold (flag less). */
export function bestThreshold(pop: readonly Scored[], m: CostMatrix): { t: number; cost: number; counts: Counts } {
  const cands = [...new Set(pop.map((r) => r.score))].sort((a, b) => b - a);
  let best = { t: Infinity, cost: costOf(confusionAt(pop, Infinity), m), counts: confusionAt(pop, Infinity) };
  for (const t of cands) {
    const counts = confusionAt(pop, t);
    const cost = costOf(counts, m);
    if (cost < best.cost) best = { t, cost, counts };
  }
  return best;
}

/* ---------- 2. Split leakage ---------- */

export interface Row { group: number; time: number; sig: [number, number]; x: number; label: 0 | 1 }
export type SplitKind = "random" | "group" | "time";

/**
 * Users (groups) each have a fixed fingerprint and a personal base rate, so rows from the same user are near-duplicates.
 * The real signal `x` flips sign halfway through time (concept drift). Label ~ Bernoulli(sigmoid(a(time) * x + userBias)).
 */
export function makeRows(groups: number, perGroup: number, seed = 11): Row[] {
  const u = rng(seed);
  const rows: Row[] = [];
  for (let g = 0; g < groups; g++) {
    const sig: [number, number] = [u(), u()];
    const bias = 3 * gauss(u);
    for (let i = 0; i < perGroup; i++) {
      const time = u();
      const x = gauss(u);
      const a = time < 0.5 ? 1.6 : -1.6;
      rows.push({ group: g, time, sig: [sig[0] + 0.003 * gauss(u), sig[1] + 0.003 * gauss(u)], x, label: u() < sigmoid(a * x + bias) ? 1 : 0 });
    }
  }
  return rows;
}

export function splitRows(rows: readonly Row[], kind: SplitKind, seed = 2): { train: Row[]; test: Row[] } {
  const u = rng(seed);
  if (kind === "time") return { train: rows.filter((r) => r.time < 0.5), test: rows.filter((r) => r.time >= 0.5) };
  if (kind === "group") {
    const n = Math.max(...rows.map((r) => r.group)) + 1;
    const held = new Set<number>();
    const order = Array.from({ length: n }, (_, i) => i).sort(() => u() - 0.5);
    for (const g of order.slice(0, Math.round(n * 0.3))) held.add(g);
    return { train: rows.filter((r) => !held.has(r.group)), test: rows.filter((r) => held.has(r.group)) };
  }
  const train: Row[] = [], test: Row[] = [];
  for (const r of rows) (u() < 0.7 ? train : test).push(r);
  return { train, test };
}

/** 1-nearest-neighbour on (fingerprint, x, time): a deliberately greedy memoriser that exposes leakage. */
export function nnAccuracy(train: readonly Row[], test: readonly Row[]): number {
  let ok = 0;
  for (const q of test) {
    let best = Infinity, lab: 0 | 1 = 0;
    for (const r of train) {
      const d = (r.sig[0] - q.sig[0]) ** 2 + (r.sig[1] - q.sig[1]) ** 2 + 0.002 * (r.x - q.x) ** 2 + 0.002 * (r.time - q.time) ** 2;
      if (d < best) { best = d; lab = r.label; }
    }
    if (lab === q.label) ok++;
  }
  return ok / test.length;
}

export const splitAccuracy = (rows: readonly Row[], kind: SplitKind): number => {
  const { train, test } = splitRows(rows, kind);
  return nnAccuracy(train, test);
};

/* ---------- 3. A/B testing and peeking ---------- */

/** Standard normal CDF via the Abramowitz-Stegun erf approximation (abs error < 1.5e-7). */
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-(z * z) / 2);
  return z >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
}

export function normalQuantile(p: number): number {
  let lo = -8, hi = 8;
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (normalCdf(mid) < p) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}

export const zCritical = (alpha: number): number => normalQuantile(1 - alpha / 2);

/** Per-arm sample size for a two-sided two-sample z-test on a standardised effect `delta`. */
export function sampleSizePerArm(delta: number, alpha = 0.05, power = 0.8): number {
  return Math.ceil(2 * ((zCritical(alpha) + normalQuantile(power)) / delta) ** 2);
}

export interface PeekOptions { experiments: number; nPerArm: number; looks: number; alpha?: number; effect?: number; bonferroni?: boolean; seed?: number }
export interface PeekResult { rate: number; avgStop: number }

/**
 * Simulate `experiments` identical A/B tests (outcomes N(0,1); arm B shifted by `effect` standard deviations).
 * The analyst looks `looks` times at evenly spaced sample sizes and stops at the first |z| above the threshold.
 * With effect = 0 `rate` is the false-positive rate; otherwise it is the power.
 */
export function simulatePeeking(o: PeekOptions): PeekResult {
  const alpha = o.alpha ?? 0.05, effect = o.effect ?? 0, u = rng(o.seed ?? 21);
  const zc = zCritical(o.bonferroni ? alpha / o.looks : alpha);
  const chunk = o.nPerArm / o.looks;
  let hits = 0, stopSum = 0;
  for (let e = 0; e < o.experiments; e++) {
    let sa = 0, sb = 0, stopped = o.nPerArm;
    for (let k = 1; k <= o.looks; k++) {
      sa += Math.sqrt(chunk) * gauss(u);
      sb += Math.sqrt(chunk) * gauss(u) + chunk * effect;
      const n = chunk * k;
      const z = (sb / n - sa / n) / Math.sqrt(2 / n);
      if (Math.abs(z) > zc) { hits++; stopped = n; break; }
    }
    stopSum += stopped;
  }
  return { rate: hits / o.experiments, avgStop: stopSum / o.experiments };
}
