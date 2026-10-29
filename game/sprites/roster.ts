import type { SpriteDef } from "./pixel";
import { NEURON_PUP_PERCEPTRON } from "./creatures/neuron-pup-perceptron";
import { NEURON_PUP_PERCEPTRON_BACK } from "./creatures/neuron-pup-perceptron-back";
import { PLAYER } from "./characters/player";
import { PLAYER_PORTRAIT } from "./characters/player-portrait";
import { OKAFOR } from "./characters/okafor";
import { OKAFOR_PORTRAIT } from "./characters/okafor-portrait";
import { PYTHON_PORT_TILES } from "./tiles/python-port-tiles";
import { LAB_TILES } from "./tiles/lab-tiles";
import { PORT_PREVIEW, LAB_PREVIEW } from "./maps";

/** Every sprite in the game, in review order (the /dev/sprites page lists these). */
export const SPRITES: readonly SpriteDef[] = [NEURON_PUP_PERCEPTRON, NEURON_PUP_PERCEPTRON_BACK, PLAYER, PLAYER_PORTRAIT, OKAFOR, OKAFOR_PORTRAIT, PYTHON_PORT_TILES, LAB_TILES, PORT_PREVIEW, LAB_PREVIEW];

export const spriteById = (id: string): SpriteDef | undefined => SPRITES.find((s) => s.id === id);
