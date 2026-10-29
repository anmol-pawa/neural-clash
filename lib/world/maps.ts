import { LAB_GRID, LAB_LEGEND, PORT_GRID, PORT_LEGEND } from "@/game/sprites/maps";
import type { MapDef } from "./world";

const PORT_SOLID = new Set(["water", "shore", "tree-top", "tree-trunk", "fence", "sign", "lamp", "roof-left", "roof", "roof-right", "wall", "window", "statue", "bench"]);
const LAB_SOLID = new Set(["wall", "wall-base", "window", "board-left", "board-right", "desk-papers", "monitor", "server", "plant", "bookshelf", "rig", "coffee"]);

export const PYTHON_PORT: MapDef = {
  id: "python-port",
  name: "Python Port",
  tileset: "python-port-tiles",
  grid: PORT_GRID,
  legend: PORT_LEGEND,
  solid: PORT_SOLID,
  warps: [{ x: 8, y: 3, to: "lab", toX: 8, toY: 9, face: "up" }],
  npcs: [{ id: "dockhand", name: "Dockhand Ines", sprite: "okafor", x: 13, y: 6, face: "left", script: "dockhand" }],
  props: [
    { x: 1, y: 5, script: "port-sign" },
    { x: 12, y: 5, script: "serpent-statue" },
  ],
  spawn: { x: 10, y: 5, face: "left" },
};

export const LAB: MapDef = {
  id: "lab",
  name: "Okafor's Lab",
  tileset: "lab-tiles",
  grid: LAB_GRID,
  legend: LAB_LEGEND,
  solid: LAB_SOLID,
  warps: [8, 9].map((x) => ({ x, y: 10, to: "python-port", toX: 8, toY: 4, face: "down" as const })),
  npcs: [{ id: "okafor", name: "Prof. Okafor", sprite: "okafor", portrait: "okafor-portrait", x: 11, y: 7, face: "left", script: "okafor-intro" }],
  props: [{ x: 8, y: 6, script: "training-rig" }],
  spawn: { x: 8, y: 9, face: "up" },
};

export const MAPS: Readonly<Record<string, MapDef>> = { [PYTHON_PORT.id]: PYTHON_PORT, [LAB.id]: LAB };
