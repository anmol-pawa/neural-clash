/** Pure probability simulators behind /dev/clt: central limit theorem, natural-frequency Bayes tree, and optional-stopping (peeking). All seeded. */
import { rng } from "@/lib/cards/rng";
import { twoProportionZ, twoSidedP } from "@/lib/solvers/probability";

// ---------- Central limit theorem ----------
export type SourceId = "uniform" | "exponential" | "bernoulli" | "bimodal";

export interface Source {
  id: SourceId;
  label: string;
  mean: number;
  sd: number;
  draw: (u: () => number) => number;
}

export const SOURCES: Record<SourceId, Source> = {
  uniform: { id: "uniform", label: "Uniform(0,1)", mean: 0.5, sd: Math.sqrt(1 / 12), draw: (u) => u() },
  exponential: { id: "exponential", label: "Exponential(1)", mean: 1, sd: 1, draw: (u) => -Math.log(1 - u()) },
  // Rare event: p = 0.1 (skewed, discrete).
  bernoulli: { id: "bernoulli", label: "Bernoulli(0.1)", mean: 0.1, sd: Math.sqrt(0.1 * 0.9), draw: (u) => (u() < 0.1 ? 1 : 0) },
  // Two spikes at 0 and 1, equal weight: nothing like a bell.
  bimodal: { id: "bimodal", label: "Two spikes (0 or 1)", mean: 0.5, sd: 0.5, draw: (u) => (u() < 0.5 ? 0 : 1) },
};

export interface CltResult {
  means: number[];
  sampleMean: number;
  sampleSd: number;
  /** sigma / sqrt(n): the standard error the theorem predicts. */
  predictedSd: number;
  skewness: number;
  /** Fraction of sample means within 1.96 predicted SEs of mu (a normal would give 0.95). */
  coverage95: number;
  hist: { lo: number; hi: number; count: number; density: number }[];
}

export function runClt(source: SourceId, n: number, reps: number, seed = 1, bins = 30): CltResult {
  const s = SOURCES[source];
  const u = rng(seed);
  const means: number[] = [];
  for (let r = 0; r < reps; r++) {
    let t = 0;
    for (let i = 0; i < n; i++) t += s.draw(u);
    means.push(t / n);
  }
  const m = means.reduce((a, b) => a + b, 0) / reps;
  const v = means.reduce((a, b) => a + (b - m) ** 2, 0) / reps;
  const sd = Math.sqrt(v);
  const skewness = sd > 0 ? means.reduce((a, b) => a + ((b - m) / sd) ** 3, 0) / reps : 0;
  const predictedSd = s.sd / Math.sqrt(n);
  const coverage95 = means.filter((x) => Math.abs(x - s.mean) <= 1.96 * predictedSd).length / reps;
  // The histogram window follows the data so the bell stays legible as the spread shrinks.
  const lo = Math.min(...means);
  const hi = Math.max(...means);
  const w = (hi - lo) / bins || 1;
  const counts = new Array<number>(bins).fill(0);
  for (const x of means) counts[Math.min(bins - 1, Math.floor((x - lo) / w))]++;
  const hist = counts.map((count, i) => ({ lo: lo + i * w, hi: lo + (i + 1) * w, count, density: count / reps / w }));
  return { means, sampleMean: m, sampleSd: sd, predictedSd, skewness, coverage95, hist };
}

/** Normal density, for overlaying the CLT prediction. */
export const normalPdf = (x: number, mu: number, sd: number): number => Math.exp(-0.5 * ((x - mu) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI));

// ---------- Base-rate tree (natural frequencies) ----------
export interface BayesTree {
  population: number;
  sick: number;
  healthy: number;
  truePositives: number;
  falseNegatives: number;
  falsePositives: number;
  trueNegatives: number;
  /** P(sick | positive) = TP / (TP + FP). */
  ppv: number;
  /** P(healthy | negative). */
  npv: number;
}

/** Counts are exact expectations (not rounded), so the tree always adds up; the UI rounds for display. */
export function bayesTree(prevalence: number, sensitivity: number, specificity: number, population = 10000): BayesTree {
  const sick = population * prevalence;
  const healthy = population - sick;
  const tp = sick * sensitivity;
  const fn = sick - tp;
  const tn = healthy * specificity;
  const fp = healthy - tn;
  return { population, sick, healthy, truePositives: tp, falseNegatives: fn, falsePositives: fp, trueNegatives: tn, ppv: tp + fp > 0 ? tp / (tp + fp) : NaN, npv: tn + fn > 0 ? tn / (tn + fn) : NaN };
}

// ---------- Peeking (optional stopping) ----------
export interface PeekResult {
  trials: number;
  looks: number;
  /** Share of A/A experiments with p < alpha at the single planned final look. */
  fixedHorizonRate: number;
  /** Share declared "significant" if you stop the first time any look has p < alpha. */
  peekingRate: number;
  /** Independent-looks upper bound 1 - (1 - alpha)^looks (looks are correlated, so reality is lower). */
  independentBound: number;
  /** Rejection rate by look index, cumulative (stop at first significant). */
  cumulativeByLook: number[];
}

/** A/A test: both arms share conversion rate p, so every "significant" result is a false positive. */
export function simulatePeeking(trials: number, looks: number, perLook: number, p = 0.1, alpha = 0.05, seed = 7): PeekResult {
  const u = rng(seed);
  let fixed = 0;
  let any = 0;
  const cum = new Array<number>(looks).fill(0);
  for (let t = 0; t < trials; t++) {
    let xa = 0, xb = 0, na = 0;
    let hit = false;
    for (let k = 0; k < looks; k++) {
      for (let i = 0; i < perLook; i++) {
        if (u() < p) xa++;
        if (u() < p) xb++;
      }
      na += perLook;
      const z = twoProportionZ(xa, na, xb, na);
      const sig = Number.isFinite(z) && twoSidedP(z) < alpha;
      if (sig && !hit) { hit = true; for (let j = k; j < looks; j++) cum[j]++; }
      if (k === looks - 1 && sig) fixed++;
    }
    if (hit) any++;
  }
  return { trials, looks, fixedHorizonRate: fixed / trials, peekingRate: any / trials, independentBound: 1 - (1 - alpha) ** looks, cumulativeByLook: cum.map((c) => c / trials) };
}
