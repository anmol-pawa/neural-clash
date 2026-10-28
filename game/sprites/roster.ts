import type { SpriteDef } from "./pixel";
import { NEURON_PUP_PERCEPTRON } from "./creatures/neuron-pup-perceptron";
import { NEURON_PUP_PERCEPTRON_BACK } from "./creatures/neuron-pup-perceptron-back";

/** Every sprite in the game, in review order (the /dev/sprites page lists these). */
export const SPRITES: readonly SpriteDef[] = [NEURON_PUP_PERCEPTRON, NEURON_PUP_PERCEPTRON_BACK];

export const spriteById = (id: string): SpriteDef | undefined => SPRITES.find((s) => s.id === id);
