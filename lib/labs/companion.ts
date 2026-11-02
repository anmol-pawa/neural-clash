/** Companion stats derived from a model's held-out test metrics (GDD: the companion is what you trained). */
export interface TestMetrics {
  /** Test R squared (regression). May be negative. */
  r2: number;
}

export interface CompanionStats {
  /** 0-100: how much of the target's variance the model explains on unseen data. */
  power: number;
  /** Rank label shown on the stat card. */
  grade: "Raw" | "Trained" | "Sharp" | "Elite";
}

/** R squared at or below 0 (no better than predicting the mean) is power 0; 1 is power 100. */
export function companionStats(m: TestMetrics): CompanionStats {
  const r2 = Number.isFinite(m.r2) ? m.r2 : 0;
  const power = Math.round(Math.min(1, Math.max(0, r2)) * 100);
  const grade = power >= 95 ? "Elite" : power >= 80 ? "Sharp" : power >= 50 ? "Trained" : "Raw";
  return { power, grade };
}
