import { rng } from "@/lib/cards/rng";

/**
 * Creature Stats: a small synthetic dataset for the Classic Grove, generated in-repo from a seed.
 *
 * Generating process (documented so every claim about it can be checked):
 *  - species is drawn uniformly from three classes: Mossling (0), Emberkin (1), Tidewing (2);
 *  - for each species the features (height, weight, speed) are independent Gaussians around the
 *    species means in SPECIES_MEANS with standard deviation FEATURE_SD, so classes overlap a little
 *    and a perfect classifier does not exist;
 *  - `power` (a regression target) = 2.0 * height + 0.5 * weight - 1.0 * speed + 10 + N(0, POWER_NOISE_SD^2),
 *    independent of species except through the features.
 */
export const SPECIES = ["Mossling", "Emberkin", "Tidewing"] as const;
export const SPECIES_MEANS: readonly [number, number, number][] = [
  [30, 40, 10],
  [45, 60, 25],
  [35, 30, 40],
];
export const FEATURE_SD = 7;
export const POWER_NOISE_SD = 3;
export const POWER_WEIGHTS = { height: 2.0, weight: 0.5, speed: -1.0, bias: 10 } as const;

export interface CreatureStat {
  species: number;
  height: number;
  weight: number;
  speed: number;
  power: number;
}

function gaussian(r: () => number): number {
  // Box-Muller; 1 - r() is in (0, 1] so the log is finite.
  return Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
}

export function generateCreatureStats(n: number, seed: number): CreatureStat[] {
  const r = rng(seed);
  const rows: CreatureStat[] = [];
  for (let i = 0; i < n; i++) {
    const species = Math.floor(r() * 3);
    const [mh, mw, ms] = SPECIES_MEANS[species];
    const height = mh + FEATURE_SD * gaussian(r);
    const weight = mw + FEATURE_SD * gaussian(r);
    const speed = ms + FEATURE_SD * gaussian(r);
    const power =
      POWER_WEIGHTS.height * height + POWER_WEIGHTS.weight * weight + POWER_WEIGHTS.speed * speed + POWER_WEIGHTS.bias + POWER_NOISE_SD * gaussian(r);
    rows.push({ species, height, weight, speed, power });
  }
  return rows;
}
