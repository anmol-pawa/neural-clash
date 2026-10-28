import { parseGrid } from "./pixelGrid";

/**
 * Title-screen placeholder: the Neuron-Pup "seed" silhouette in a 3-shade ramp.
 * The full 64×64 animated Perceptron form arrives with ROADMAP B1.
 */
export const SEED_PALETTE = {
  o: "#1b1030",
  B: "#5b6ee1",
  M: "#ff9fb8",
  L: "#9db0ff",
  W: "#f4f4ff",
  K: "#1b1030",
  n: "#ffd166",
} as const;

export const SEED_ROWS = [
  "..oo........oo..",
  ".oBBo......oBBo.",
  ".oBMBoooooooBMBo",
  "oBBBBBBBBBBBBBBo",
  "oBBWKBBBBBBWKBBo",
  "oBBWKBBBBBBWKBBo",
  "oBBBBBBnnBBBBBBo",
  "oBBBBBBnnBBBBBBo",
  ".oBBBBBBBBBBBBo.",
  ".oLLLLLLLLLLLLo.",
  ".oLLoLLLLLLoLLo.",
  ".oBBoBBBBBBoBBo.",
  "..oo.oooooo.oo..",
];

export const seedSprite = () => parseGrid(SEED_ROWS, SEED_PALETTE);
