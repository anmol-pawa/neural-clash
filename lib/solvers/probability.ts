/** Small pure probability/statistics solvers used to cross-check the Probability Peaks deck (answers are computed by numpy; see tests/probability.test.ts). */

/** P(disease | positive) from the prior, the sensitivity P(+ | disease) and the false-positive rate P(+ | healthy). */
export function bayesPosterior(prior: number, sens: number, fpr: number): number {
  const hit = sens * prior;
  return hit / (hit + fpr * (1 - prior));
}

/** Total probability of a positive result. */
export const pPositive = (prior: number, sens: number, fpr: number): number => sens * prior + fpr * (1 - prior);

export const oddsToProb = (odds: number): number => odds / (1 + odds);

export interface Moments { mean: number; secondMoment: number; variance: number }
/** Mean, E[X^2] and variance of a discrete distribution. */
export function discreteMoments(values: readonly number[], probs: readonly number[]): Moments {
  const mean = values.reduce((s, v, i) => s + v * probs[i], 0);
  const secondMoment = values.reduce((s, v, i) => s + v * v * probs[i], 0);
  return { mean, secondMoment, variance: secondMoment - mean * mean };
}

/** Variance with a degrees-of-freedom correction: ddof 0 is the MLE, 1 is the unbiased estimate. */
export function variance(x: readonly number[], ddof = 0): number {
  const m = x.reduce((s, v) => s + v, 0) / x.length;
  return x.reduce((s, v) => s + (v - m) ** 2, 0) / (x.length - ddof);
}

/** Error function (Abramowitz and Stegun 7.1.26 is too coarse; this uses the series/continued fraction good to ~1e-12). */
export function erf(x: number): number {
  const ax = Math.abs(x);
  let r: number;
  if (ax < 3) {
    // Maclaurin series converges quickly here.
    let term = ax;
    let sum = ax;
    for (let n = 1; n < 100; n++) {
      term *= (-ax * ax) / n;
      const add = term / (2 * n + 1);
      sum += add;
      if (Math.abs(add) < 1e-17) break;
    }
    r = (2 / Math.sqrt(Math.PI)) * sum;
  } else {
    // Continued fraction for erfc.
    let f = 0;
    for (let k = 60; k >= 1; k--) f = k / 2 / (ax + f);
    r = 1 - Math.exp(-ax * ax) / (Math.sqrt(Math.PI) * (ax + f));
  }
  return x < 0 ? -r : r;
}

export const erfc = (x: number): number => 1 - erf(x);

/** Two-sided p-value for a z statistic. */
export const twoSidedP = (z: number): number => erfc(Math.abs(z) / Math.SQRT2);

/** Probability that a normal variable lies within k standard deviations of its mean. */
export const withinSigmas = (k: number): number => erf(k / Math.SQRT2);

/** Pooled two-proportion z statistic for (x2/n2 - x1/n1). */
export function twoProportionZ(x1: number, n1: number, x2: number, n2: number): number {
  const pool = (x1 + x2) / (n1 + n2);
  const se = Math.sqrt(pool * (1 - pool) * (1 / n1 + 1 / n2));
  return (x2 / n2 - x1 / n1) / se;
}

/** Simplified per-arm sample size n = 2 z^2 p (1 - p) / delta^2 with z = z_alpha/2 + z_power. */
export const sampleSizePerArm = (p: number, delta: number, z = 1.96 + 0.8416): number => (2 * z * z * p * (1 - p)) / (delta * delta);

/** Probability of at least one false positive across k independent tests at level alpha. */
export const familywiseError = (k: number, alpha = 0.05): number => 1 - (1 - alpha) ** k;

export const entropy = (p: readonly number[], base = Math.E): number => -p.reduce((s, x) => (x > 0 ? s + x * Math.log(x) : s), 0) / Math.log(base);

export function crossEntropy(p: readonly number[], q: readonly number[]): number {
  return -p.reduce((s, x, i) => (x > 0 ? s + x * Math.log(q[i]) : s), 0);
}

export function klDivergence(p: readonly number[], q: readonly number[]): number {
  return p.reduce((s, x, i) => (x > 0 ? s + x * Math.log(x / q[i]) : s), 0);
}

/** Perplexity of the probabilities a model gave to observed tokens (exp of the mean negative log-likelihood). */
export const perplexityOfProbs = (probs: readonly number[]): number => Math.exp(-probs.reduce((s, p) => s + Math.log(p), 0) / probs.length);

/** Mean binary negative log-likelihood. */
export function binaryLogLoss(y: readonly number[], p: readonly number[]): number {
  return -y.reduce((s, yi, i) => s + yi * Math.log(p[i]) + (1 - yi) * Math.log(1 - p[i]), 0) / y.length;
}

/** MLE and Beta(a, b)-prior MAP estimates of a Bernoulli parameter from k successes in n trials. */
export const bernoulliMle = (k: number, n: number): number => k / n;
export const bernoulliMap = (k: number, n: number, a = 2, b = 2): number => (k + a - 1) / (n + a + b - 2);
