/**
 * Companion stats from Lab results (GDD 5.2). Pure: save data in, numbers out.
 *
 * Each stat is earned by solving the Lab that trains it; an unassisted solve (no hints) earns the
 * full value, an assisted one half. The Labs are judged by hidden tests (gradient checks, held-out
 * R² for `linear-gd`), so a stat is a record of a measured pass, not a participation award.
 */
export interface LabRecord {
  passed: boolean;
  assisted: boolean;
}

export interface CompanionStats {
  /** Hit points of the Perceptron form: grows with the number of Labs solved. */
  vitality: number;
  /** Attack: correct gradients (linear-gd). */
  power: number;
  /** Accuracy of moves: the trained model generalises (linear-gd's held-out R² checks). */
  precision: number;
  /** Speed: vectorised numpy code (the np-* Labs). */
  speed: number;
}

export const BASE_STATS: CompanionStats = { vitality: 20, power: 5, precision: 5, speed: 5 };

const earn = (r: LabRecord | undefined, full: number) => (r?.passed ? (r.assisted ? Math.ceil(full / 2) : full) : 0);

export function companionStats(labs: Record<string, LabRecord>): CompanionStats {
  const solved = Object.values(labs).filter((l) => l.passed).length;
  const npIds = Object.keys(labs).filter((id) => id.startsWith("np-"));
  const speedPts = npIds.reduce((a, id) => a + earn(labs[id], 2), 0);
  return {
    vitality: BASE_STATS.vitality + Math.min(solved, 20),
    power: BASE_STATS.power + earn(labs["linear-gd"], 10),
    precision: BASE_STATS.precision + earn(labs["linear-gd"], 10),
    speed: BASE_STATS.speed + Math.min(speedPts, 16),
  };
}
