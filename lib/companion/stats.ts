/** Companion battle stats derived from measured model metrics (GDD 5.3). Pure, no DOM. */

export interface ModelMetrics {
  /** Held-out score in (-inf, 1]: R^2 for regression, accuracy for classification. */
  testScore: number;
  /** The same score on the training data. */
  trainScore: number;
  /** Number of learned parameters (a proxy for inference cost). */
  params: number;
}

export interface CompanionStats {
  /** 0-100: how well the model does on data it never saw. */
  attack: number;
  /** 0-100: robustness = how little the score drops from train to test. */
  defence: number;
  /** 0-100: cheap models are fast; cost is on a log scale. */
  speed: number;
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export function companionStats(m: ModelMetrics): CompanionStats {
  if (![m.testScore, m.trainScore, m.params].every(Number.isFinite) || m.params < 1) {
    throw new Error("companionStats: metrics must be finite and params >= 1");
  }
  const attack = clamp(m.testScore, 0, 1) * 100;
  // Overfitting shows up as train >> test; underfitting is not rewarded as "robust" because attack stays low.
  const gap = Math.max(0, m.trainScore - m.testScore);
  const defence = clamp(1 - gap * 4, 0, 1) * 100;
  // 1 param = 100, 1e9 params = 0 (log10 scale).
  const speed = clamp(1 - Math.log10(m.params) / 9, 0, 1) * 100;
  return { attack: Math.round(attack), defence: Math.round(defence), speed: Math.round(speed) };
}
