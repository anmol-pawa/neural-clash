import { rng } from "../cards/rng";

/**
 * Creature Stats: a seeded tabular dataset with a documented generating process.
 *
 * Task: predict `rare` (is this creature a rare variant?), prevalence about 8%.
 *
 * Generating process (all planted on purpose, so lessons can measure them):
 *  - habitat in {0 grove, 1 marsh, 2 cave}, drawn 50/30/20.
 *  - level ~ round(N(10 + 3*habitat, 3^2)); habitat CONFOUNDS level and rarity: rarity rates are
 *    HABITAT_RARE (5%/8%/16%), and caves also raise level, so level looks predictive of rarity
 *    without causing it (conditional on habitat the association vanishes).
 *  - power = 2*level + noise (a redundant copy of level); speed ~ N(50, 10^2) is pure noise.
 *  - shimmer ~ N(0.6*rare, 0.5^2): the one real, causal signal (rare creatures shimmer more).
 *  - LEAK `caught_by_rare_ranger` = 1 for 95% of rare creatures and 2% of common ones. It is recorded
 *    AFTER the label is known, so a model that uses it looks superb and is useless in deployment.
 *  - class imbalance comes from the base rate; accuracy of "always common" is therefore about 92%.
 */
export const HABITAT_RARE = [0.05, 0.08, 0.16];

export type CreatureRow = {
  habitat: number;
  level: number;
  power: number;
  speed: number;
  shimmer: number;
  caught_by_rare_ranger: number;
  rare: number;
};

function normal(r: () => number): number {
  const u = Math.max(r(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
}

export function creatureStats(n: number, seed = 7): CreatureRow[] {
  const r = rng(seed);
  const rows: CreatureRow[] = [];
  for (let i = 0; i < n; i++) {
    const u = r();
    const habitat = u < 0.5 ? 0 : u < 0.8 ? 1 : 2;
    const level = Math.max(1, Math.round(10 + 3 * habitat + 3 * normal(r)));
    const rare = r() < HABITAT_RARE[habitat] ? 1 : 0;
    const power = 2 * level + 2 * normal(r);
    const speed = 50 + 10 * normal(r);
    const shimmer = 0.6 * rare + 0.5 * normal(r);
    const flip = r() < 0.02;
    const caught = rare ? (r() < 0.95 ? 1 : 0) : flip ? 1 : 0;
    rows.push({ habitat, level, power, speed, shimmer, caught_by_rare_ranger: caught, rare });
  }
  return rows;
}
