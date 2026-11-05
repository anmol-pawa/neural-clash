/** Pure probability playground: CLT sampling distributions, Bayes frequency trees and the peeking (optional stopping) simulator. */
import { rng } from "@/lib/cards/rng";
import { bayesPosterior, erf } from "@/lib/solvers/probability";

export type DistId = "uniform" | "exponential" | "bimodal" | "bernoulli";

export interface Dist {
  id: DistId;
  label: string;
  blurb: string;
  mean: number;
  sd: number;
  /** Draw one sample from a uniform [0,1) source. */
  draw: (u: () => number) => number;
}

export const DISTS: Record<DistId, Dist> = {
  uniform: { id: "uniform", label: "Uniform(0,1)", blurb: "Flat and symmetric: the mean of even a few draws already looks bell-shaped.", mean: 0.5, sd: Math.sqrt(1 / 12), draw: (u) => u() },
  exponential: { id: "exponential", label: "Exponential(1)", blurb: "Heavily right-skewed (skewness 2). The mean needs many draws before the skew fades.", mean: 1, sd: 1, draw: (u) => -Math.log(1 - u()) },
  bimodal: {
    id: "bimodal", label: "Two spikes (0 or 1)", blurb: "Half the mass at 0 and half at 1, nothing between: the opposite of a bell, yet means of draws still converge to one.",
    mean: 0.5, sd: 0.5, draw: (u) => (u() < 0.5 ? 0 : 1),
  },
  bernoulli: { id: "bernoulli", label: "Rare event p = 0.1", blurb: "A coin that lands heads 10% of the time. Skewed, so the normal approximation needs n p (1-p) large.", mean: 0.1, sd: Math.sqrt(0.09), draw: (u) => (u() < 0.1 ? 1 : 0) },
};

/** Means of `trials` independent samples of size n. Deterministic given the seed. */
export function sampleMeans(dist: DistId, n: number, trials: number, seed = 1): number[] {
  const u = rng(seed);
  const d = DISTS[dist];
  const out: number[] = [];
  for (let t = 0; t < trials; t++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += d.draw(u);
    out.push(s / n);
  }
  return out;
}

export interface Summary { mean: number; sd: number; skew: number }
/** Mean, population standard deviation and skewness of a sample. */
export function summarise(x: readonly number[]): Summary {
  const m = x.reduce((s, v) => s + v, 0) / x.length;
  const v = x.reduce((s, a) => s + (a - m) ** 2, 0) / x.length;
  const sd = Math.sqrt(v);
  const skew = sd === 0 ? 0 : x.reduce((s, a) => s + ((a - m) / sd) ** 3, 0) / x.length;
  return { mean: m, sd, skew };
}

/** The CLT prediction for the sample mean of n draws: mean mu, standard error sigma / sqrt(n). */
export const clt = (dist: DistId, n: number): { mean: number; se: number } => ({ mean: DISTS[dist].mean, se: DISTS[dist].sd / Math.sqrt(n) });

/** Equal-width histogram counts over [lo, hi]; values outside are clamped into the end bins. */
export function histogram(x: readonly number[], bins: number, lo: number, hi: number): number[] {
  const h = new Array<number>(bins).fill(0);
  for (const v of x) h[Math.min(bins - 1, Math.max(0, Math.floor(((v - lo) / (hi - lo)) * bins)))]++;
  return h;
}

/** Normal density with mean m and standard deviation s. */
export const normalPdf = (x: number, m: number, s: number): number => Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));

// ---------- Bayes frequency tree ----------

export interface FreqTree { population: number; sick: number; healthy: number; truePos: number; falseNeg: number; falsePos: number; trueNeg: number; posterior: number }

/** Natural-frequency tree of `population` people. Counts are rounded, so choose a population that makes them whole for clean numbers. */
export function freqTree(prior: number, sens: number, fpr: number, population = 10000): FreqTree {
  const sick = Math.round(population * prior);
  const healthy = population - sick;
  const truePos = Math.round(sick * sens);
  const falsePos = Math.round(healthy * fpr);
  return { population, sick, healthy, truePos, falseNeg: sick - truePos, falsePos, trueNeg: healthy - falsePos, posterior: truePos / (truePos + falsePos) };
}

export { bayesPosterior };

// ---------- Peeking simulator ----------

export interface PeekConfig {
  /** Users per arm at the final look. */
  nPerArm: number;
  /** Number of equally spaced looks (1 = a single, pre-planned look). */
  looks: number;
  /** Shared true conversion rate (an A/A test: there is no real effect). */
  rate: number;
  /** Simulated experiments. */
  experiments: number;
  /** Two-sided critical |z|; 1.96 for alpha = 0.05. */
  zCrit?: number;
  seed?: number;
}

export interface PeekResult {
  /** Fraction of A/A experiments declared "significant" at ANY look (stop at the first one). */
  falsePositiveRate: number;
  /** Fraction that were significant at the final look alone. */
  finalLookOnlyRate: number;
  /** The independent-looks upper bound 1 - (1 - alpha)^looks for comparison (not exact: looks are correlated). */
  independentBound: number;
}

/** Two-proportion z statistic with a pooled standard error; 0 when the pooled variance is 0. */
export function twoPropZ(xa: number, na: number, xb: number, nb: number): number {
  const pooled = (xa + xb) / (na + nb);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / na + 1 / nb));
  return se === 0 ? 0 : (xb / nb - xa / na) / se;
}

/** Monte-Carlo estimate of the false-positive rate when an A/A test is checked `looks` times and stopped at the first |z| > zCrit. */
export function simulatePeeking(cfg: PeekConfig): PeekResult {
  const zc = cfg.zCrit ?? 1.96;
  const u = rng(cfg.seed ?? 7);
  const alpha = 2 * (1 - normalCdf(zc));
  let any = 0;
  let last = 0;
  const chunk = Math.max(1, Math.floor(cfg.nPerArm / cfg.looks));
  for (let e = 0; e < cfg.experiments; e++) {
    let xa = 0, xb = 0, n = 0, hit = false, lastZ = 0;
    for (let l = 1; l <= cfg.looks; l++) {
      const add = l === cfg.looks ? cfg.nPerArm - n : chunk;
      for (let i = 0; i < add; i++) { if (u() < cfg.rate) xa++; if (u() < cfg.rate) xb++; }
      n += add;
      lastZ = twoPropZ(xa, n, xb, n);
      if (Math.abs(lastZ) > zc) hit = true;
    }
    if (hit) any++;
    if (Math.abs(lastZ) > zc) last++;
  }
  return { falsePositiveRate: any / cfg.experiments, finalLookOnlyRate: last / cfg.experiments, independentBound: 1 - (1 - alpha) ** cfg.looks };
}

/** Standard normal CDF. */
export function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}
