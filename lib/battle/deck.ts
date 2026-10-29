import type { Card } from "./cards";
import { GENERATORS } from "./generators";
import { makeRng } from "./rng";

/** Builds a reproducible deck of `n` generated cards, cycling through generators so every kind appears. */
export function generatedDeck(seed: number, n: number): Card[] {
  const rng = makeRng(seed);
  return Array.from({ length: n }, (_, i) => GENERATORS[i % GENERATORS.length](rng, `gen-${seed}-${i}`));
}
