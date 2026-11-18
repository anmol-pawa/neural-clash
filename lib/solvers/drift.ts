/**
 * Data-drift solvers: Population Stability Index, the two-sample Kolmogorov-Smirnov statistic and a rolling-window alarm.
 * Pure arithmetic on plain arrays. PSI bin edges always come from the *baseline* sample (the data the model was trained on),
 * never from live data, so the live histogram is compared on a fixed yardstick.
 */

/** Linear-interpolation quantile (numpy's default, "type 7"). q in [0, 1]. */
export function quantile(values: readonly number[], q: number): number {
  if (values.length === 0) throw new RangeError("quantile of an empty sample");
  if (!(q >= 0 && q <= 1)) throw new RangeError("q must be in [0, 1]");
  const s = [...values].sort((a, b) => a - b);
  const pos = q * (s.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.min(lo + 1, s.length - 1);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

/** Smallest proportion used inside the log, so an empty bin gives a large but finite contribution. */
export const PSI_EPSILON = 1e-4;

/** PSI of two histograms given as proportions: sum_i (a_i - e_i) ln(a_i / e_i). Symmetric in its arguments. */
export function psiFromProportions(expected: readonly number[], actual: readonly number[], epsilon = PSI_EPSILON): number {
  if (expected.length !== actual.length || expected.length === 0) throw new RangeError("histograms must have the same non-zero length");
  let total = 0;
  for (let i = 0; i < expected.length; i++) {
    const e = Math.max(expected[i], epsilon);
    const a = Math.max(actual[i], epsilon);
    total += (a - e) * Math.log(a / e);
  }
  return total;
}

/** Interior bin edges at the baseline's equal-mass quantiles (nBins - 1 edges). */
export function quantileEdges(baseline: readonly number[], nBins: number): number[] {
  if (!Number.isInteger(nBins) || nBins < 2) throw new RangeError("need at least two bins");
  return Array.from({ length: nBins - 1 }, (_, i) => quantile(baseline, (i + 1) / nBins));
}

/** Proportion of values in each bin; a value equal to an edge goes to the upper bin (numpy `searchsorted(side="right")`). */
export function binProportions(values: readonly number[], edges: readonly number[]): number[] {
  if (values.length === 0) throw new RangeError("empty sample");
  const counts = new Array<number>(edges.length + 1).fill(0);
  for (const v of values) {
    let b = 0;
    while (b < edges.length && v >= edges[b]) b++;
    counts[b]++;
  }
  return counts.map((c) => c / values.length);
}

/** PSI of a live sample against a baseline sample, using the baseline's quantile bins (default 10). */
export function psi(baseline: readonly number[], live: readonly number[], nBins = 10): number {
  const edges = quantileEdges(baseline, nBins);
  return psiFromProportions(binProportions(baseline, edges), binProportions(live, edges));
}

/** Common reading of PSI. The 0.1 and 0.25 cut-offs are industry rules of thumb, not statistical tests. */
export function psiBand(value: number): "stable" | "moderate" | "major" {
  return value < 0.1 ? "stable" : value < 0.25 ? "moderate" : "major";
}

/** Two-sample Kolmogorov-Smirnov statistic: the largest gap between the two empirical CDFs. */
export function ks2Statistic(a: readonly number[], b: readonly number[]): number {
  if (a.length === 0 || b.length === 0) throw new RangeError("empty sample");
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  let i = 0;
  let j = 0;
  let d = 0;
  while (i < sa.length && j < sb.length) {
    const v = Math.min(sa[i], sb[j]);
    while (i < sa.length && sa[i] <= v) i++;
    while (j < sb.length && sb[j] <= v) j++;
    d = Math.max(d, Math.abs(i / sa.length - j / sb.length));
  }
  return d;
}

/** Asymptotic two-sided p-value of the KS statistic (Kolmogorov distribution, small-sample corrected). */
export function ks2PValue(d: number, n: number, m: number): number {
  if (d <= 0) return 1;
  const ne = (n * m) / (n + m);
  const lambda = (Math.sqrt(ne) + 0.12 + 0.11 / Math.sqrt(ne)) * d;
  let sum = 0;
  for (let k = 1; k <= 100; k++) {
    const term = 2 * (k % 2 === 1 ? 1 : -1) * Math.exp(-2 * k * k * lambda * lambda);
    sum += term;
    if (Math.abs(term) < 1e-12) break;
  }
  return Math.min(1, Math.max(0, sum));
}

export interface AlarmOptions {
  /** Window length in observations. */
  window: number;
  /** Baseline mean and standard deviation of the monitored feature. */
  mean: number;
  std: number;
  /** Alarm when the window mean is more than this many standard errors from the baseline mean. */
  zLimit: number;
  /** Consecutive alarming windows required before the alarm fires (debounce). */
  patience?: number;
}

/**
 * Slide a window over a stream and return the index (into the stream) of the last observation of the window that
 * completes the alarm, or -1 if it never fires. The window mean's standard error is std / sqrt(window).
 */
export function rollingAlarm(stream: readonly number[], opts: AlarmOptions): number {
  const { window, mean, std, zLimit } = opts;
  const patience = opts.patience ?? 1;
  if (!Number.isInteger(window) || window < 1) throw new RangeError("window must be a positive integer");
  if (!(std > 0)) throw new RangeError("std must be positive");
  let run = 0;
  let sum = 0;
  for (let t = 0; t < stream.length; t++) {
    sum += stream[t];
    if (t >= window) sum -= stream[t - window];
    if (t < window - 1) continue;
    const z = (sum / window - mean) / (std / Math.sqrt(window));
    run = Math.abs(z) > zLimit ? run + 1 : 0;
    if (run >= patience) return t;
  }
  return -1;
}
