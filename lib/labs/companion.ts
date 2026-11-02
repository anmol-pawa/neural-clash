/** Maps a trained model's measured test metrics to battle stats (GDD §5.3). Pure; no DOM. */
export interface ModelMetrics {
  /** Coefficient of determination on the held-out test set (may be negative). */
  r2: number;
  /** Train loss minus test loss (positive when the model generalises worse than it fits). */
  generalisationGap: number;
  /** Parameter count: a stand-in for inference cost. */
  params: number;
}

export interface CompanionStats {
  attack: number;
  defence: number;
  speed: number;
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/**
 * Attack  = test R² (negative R² is a model worse than the mean, so 0).
 * Defence = robustness to shift: a model that fits train far better than test is brittle.
 *           defence = 1 / (1 + max(0, gap) / scale) with scale = 0.1 loss units.
 * Speed   = inference cost: log-scaled so 10 params -> ~1, 10^6 params -> ~0.
 * All stats are in [0, 100] and rounded.
 */
export function companionStats(m: ModelMetrics): CompanionStats {
  const attack = clamp(m.r2, 0, 1);
  const defence = 1 / (1 + Math.max(0, m.generalisationGap) / 0.1);
  const speed = 1 - clamp((Math.log10(Math.max(1, m.params)) - 1) / 5, 0, 1);
  const pct = (x: number) => Math.round(clamp(x, 0, 1) * 100);
  return { attack: pct(attack), defence: pct(defence), speed: pct(speed) };
}
