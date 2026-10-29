import type { MapDef } from "./tileset";
import { PYTHON_PORT_TILES } from "./python-port";
import { LAB_INTERIOR_TILES } from "./lab-interior";

/**
 * Python Port, 24×16. The Lab sits at the top centre; a cobbled road runs
 * south through the plaza to a dock. Cells: g grass, f flowers, h tall grass,
 * c cobble, w water, s shore, d dock. Objects: t/u tree, H hedge, F fence,
 * L/M/R roof, W wall, N window, O door, S sign, B banner, P/p lamp, x crate,
 * b barrel, i signpost, e bench.
 */
export const PYTHON_PORT_MAP: MapDef = {
  id: "python-port",
  name: "Python Port",
  tileset: PYTHON_PORT_TILES,
  legend: { g: "grass", h: "grass2", f: "flowers", c: ["cobble", "cobble2"], w: "water", s: "shore", d: "dock", t: "tree-top", u: "tree-trunk", H: "hedge", F: "fence", L: "roof-l", M: "roof-m", R: "roof-r", W: "wall", N: "wall-window", O: "door", S: "wall-sign", B: "wall-banner", P: "lamp-top", p: "lamp-bottom", x: "crate", b: "barrel", i: "signpost", e: "bench" },
  ground: [
    "ggghgggggggggggghggggggg",
    "ggfgggggggggggggggggggfg",
    "gggggggggggggggggggggggg",
    "ghgggggggggggggggggggghg",
    "gggggggggggccggggggggggg",
    "gggggggggggccgggggggggfg",
    "gggggggggggccggggggggggg",
    "gggggggggggccggggggggggg",
    "ggcccccccccccccccccccccg",
    "gggggggggggccgggggggfggg",
    "ghgggggggggccggggggggggg",
    "gggggggggggccggggghggggg",
    "sssssssssssddsssssssssss",
    "wwwwwwwwwwwddwwwwwwwwwww",
    "wwwwwwwwwwwddwwwwwwwwwww",
    "wwwwwwwwwwwwwwwwwwwwwwww",
  ],
  objects: [
    "                        ",
    " t                  t   ",
    " u      LMMMMMMR    u   ",
    "        WNWOSWNWt       ",
    "    t           u       ",
    "    u HH       HH       ",
    "  LMMR            LMMR  ",
    "  WNOW   P    P   WBOW  ",
    "         p    p         ",
    "          i  e          ",
    "                        ",
    "  FFFFFFF         t     ",
    "                  u     ",
    "            b           ",
    "            x           ",
    "                        ",
  ],
  solid: ["water", "tree-top", "tree-trunk", "hedge", "fence", "roof-l", "roof-m", "roof-r", "wall", "wall-window", "wall-sign", "wall-banner", "lamp-top", "lamp-bottom", "crate", "barrel", "signpost", "bench"],
  warps: [{ x: 11, y: 3, to: "lab-interior", tx: 5, ty: 8 }],
  spawns: { player: [11, 9], okafor: [12, 5] },
};

/**
 * Professor Okafor's Lab, 12×10. Ground: a wall top, b wall face, f floor
 * (checker), m door mat. Objects: w window, l/r whiteboard halves, q/Q shelf,
 * k/K server rack, D/E/G desk, M monitor, C chair, R/r rug, Z/z capsule,
 * V plant.
 */
export const LAB_MAP: MapDef = {
  id: "lab-interior",
  name: "Okafor's Lab",
  tileset: LAB_INTERIOR_TILES,
  legend: { a: "wall-top", b: "wall-face", f: ["floor", "floor2"], m: "mat", w: "window", "1": "board-l", "2": "board-r", q: "shelf-top", Q: "shelf-bottom", k: "rack-top", K: "rack-bottom", D: "desk-l", E: "desk-m", G: "desk-r", M: "monitor", C: "chair", "<": "rug-l", "=": "rug-m", ">": "rug-r", Z: "capsule-top", z: "capsule-bottom", V: "plant" },
  ground: [
    "aaaaaaaaaaaa",
    "bbbbbbbbbbbb",
    "ffffffffffff",
    "ffffffffffff",
    "ffffffffffff",
    "ffffffffffff",
    "ffffffffffff",
    "ffffffffffff",
    "ffffffffffff",
    "fffffmffffff",
  ],
  objects: [
    "            ",
    "  w  12 w qq",
    "kk        QQ",
    "KK M   M    ",
    "  DEG DEG   ",
    "   C   C    ",
    "   <=>   Z  ",
    "         z  ",
    "V          V",
    "            ",
  ],
  solid: ["wall-top", "wall-face", "window", "board-l", "board-r", "shelf-top", "shelf-bottom", "rack-top", "rack-bottom", "desk-l", "desk-m", "desk-r", "monitor", "capsule-top", "capsule-bottom", "plant"],
  warps: [{ x: 5, y: 9, to: "python-port", tx: 11, ty: 4 }],
  spawns: { player: [5, 8], okafor: [6, 5] },
};

export const MAPS: readonly MapDef[] = [PYTHON_PORT_MAP, LAB_MAP];
