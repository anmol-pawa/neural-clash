import type { SpriteDef } from "./pixel";
import { NEURON_PUP_PERCEPTRON } from "./creatures/neuron-pup-perceptron";
import { NEURON_PUP_PERCEPTRON_BACK } from "./creatures/neuron-pup-perceptron-back";
import { NOISE_MINION } from "./creatures/noise-minion";
import { WARDEN_BASIS } from "./creatures/warden-basis";
import { WARDEN_CHAIN } from "./creatures/warden-chain";
import { WARDEN_BELL } from "./creatures/warden-bell";
import { WARDEN_INDENT } from "./creatures/warden-indent";
import { PLAYER } from "./characters/player";
import { PLAYER_PORTRAIT } from "./characters/player-portrait";
import { OKAFOR } from "./characters/okafor";
import { OKAFOR_PORTRAIT } from "./characters/okafor-portrait";
import { CADET_SHEAR } from "./characters/cadet-shear";
import { CADET_SHEAR_PORTRAIT } from "./characters/cadet-shear-portrait";
import { RANGER_AXIS } from "./characters/ranger-axis";
import { RANGER_AXIS_PORTRAIT } from "./characters/ranger-axis-portrait";
import { CLIMBER_DELTA } from "./characters/climber-delta";
import { CLIMBER_DELTA_PORTRAIT } from "./characters/climber-delta-portrait";
import { SURVEYOR_HESS } from "./characters/surveyor-hess";
import { SURVEYOR_HESS_PORTRAIT } from "./characters/surveyor-hess-portrait";
import { PYTHON_PORT_TILES } from "./tiles/python-port-tiles";
import { LAB_TILES } from "./tiles/lab-tiles";
import { VECTOR_VALE_TILES } from "./tiles/vector-vale-tiles";
import { GRADIENT_GORGE_TILES } from "./tiles/gradient-gorge-tiles";
import { PROBABILITY_PEAKS_TILES } from "./tiles/probability-peaks-tiles";
import { PORT_PREVIEW, LAB_PREVIEW, VALE_PREVIEW, GORGE_PREVIEW, PEAKS_PREVIEW } from "./maps";

/** Every sprite in the game, in review order (the /dev/sprites page lists these). */
export const SPRITES: readonly SpriteDef[] = [NEURON_PUP_PERCEPTRON, NEURON_PUP_PERCEPTRON_BACK, NOISE_MINION, WARDEN_INDENT, WARDEN_BASIS, WARDEN_CHAIN, WARDEN_BELL, PLAYER, PLAYER_PORTRAIT, OKAFOR, OKAFOR_PORTRAIT, CADET_SHEAR, CADET_SHEAR_PORTRAIT, RANGER_AXIS, RANGER_AXIS_PORTRAIT, CLIMBER_DELTA, CLIMBER_DELTA_PORTRAIT, SURVEYOR_HESS, SURVEYOR_HESS_PORTRAIT, PYTHON_PORT_TILES, LAB_TILES, VECTOR_VALE_TILES, GRADIENT_GORGE_TILES, PROBABILITY_PEAKS_TILES, PORT_PREVIEW, LAB_PREVIEW, VALE_PREVIEW, GORGE_PREVIEW, PEAKS_PREVIEW];

export const spriteById = (id: string): SpriteDef | undefined => SPRITES.find((s) => s.id === id);
