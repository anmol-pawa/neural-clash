import { LAB_GRID, LAB_LEGEND, PORT_GRID, PORT_LEGEND } from "@/game/sprites/maps";
import type { AreaDef } from "@/lib/world/area";

/** Python Port: the harbour town where the game starts. The Lab door is at (8,3). */
export const PYTHON_PORT: AreaDef = {
  id: "python-port",
  name: "PYTHON PORT",
  tiles: "python-port-tiles",
  grid: PORT_GRID,
  legend: PORT_LEGEND,
  solid: ["water", "tree-top", "tree-trunk", "fence", "sign", "lamp", "roof-left", "roof", "roof-right", "wall", "window", "statue", "bench"],
  spawn: { x: 11, y: 7, facing: "up" },
  npcs: [],
  warps: [{ x: 8, y: 3, to: "lab", tx: 8, ty: 9, facing: "up" }],
  interacts: [
    { x: 1, y: 5, script: "sign.port" },
    { x: 12, y: 5, script: "sign.statue" },
    { x: 8, y: 5, script: "sign.bench" },
  ],
  triggers: [],
};

/** Okafor's Lab: whiteboards, servers and the Training Rig on a rug. */
export const LAB: AreaDef = {
  id: "lab",
  name: "OKAFOR'S LAB",
  tiles: "lab-tiles",
  grid: LAB_GRID,
  legend: LAB_LEGEND,
  solid: ["wall", "wall-base", "window", "board-left", "board-right", "desk-papers", "monitor", "server", "plant", "bookshelf", "rig", "coffee"],
  spawn: { x: 8, y: 9, facing: "up" },
  npcs: [{ id: "okafor", name: "PROF. OKAFOR", sprite: "okafor", x: 9, y: 7, facing: "left", script: "okafor.intro" }],
  warps: [
    { x: 8, y: 10, to: "python-port", tx: 8, ty: 4, facing: "down" },
    { x: 9, y: 10, to: "python-port", tx: 8, ty: 4, facing: "down" },
  ],
  interacts: [
    { x: 8, y: 6, script: "sign.rig" },
    { x: 8, y: 2, script: "sign.board1" },
    { x: 9, y: 2, script: "sign.board2" },
    { x: 15, y: 5, script: "sign.coffee" },
    { x: 2, y: 4, script: "sign.servers" },
    { x: 3, y: 4, script: "sign.servers" },
  ],
  triggers: [{ x: 8, y: 8, script: "okafor.intro", once: "met_okafor" }],
};

export const AREAS: Readonly<Record<string, AreaDef>> = { [PYTHON_PORT.id]: PYTHON_PORT, [LAB.id]: LAB };
