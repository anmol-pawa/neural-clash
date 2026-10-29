import { TILESET } from "./tileset";
import { PYTHON_PORT } from "./maps/python-port";
import { LAB } from "./maps/lab";
import type { TileMap } from "./tiles";

export { TILESET };
/** Every overworld map, keyed by id (warps refer to these ids). */
export const MAPS: Readonly<Record<string, TileMap>> = { [PYTHON_PORT.id]: PYTHON_PORT, [LAB.id]: LAB };
export const MAP_IDS = Object.keys(MAPS);
