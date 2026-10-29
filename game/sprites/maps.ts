import { mapSprite, type TileLegend } from "./tilemap";
import { PYTHON_PORT_TILES } from "./tiles/python-port-tiles";
import { LAB_TILES } from "./tiles/lab-tiles";

/** Python Port, the harbour town where the game starts. */
export const PORT_LEGEND: TileLegend = {
  g: "grass", G: "grass-alt", f: "flowers", p: "path", w: "water", s: "shore", T: "tree-top", t: "tree-trunk",
  F: "fence", S: "sign", L: "lamp", "<": "roof-left", "=": "roof", ">": "roof-right", W: "wall", N: "window", D: "door", X: "statue", B: "bench",
};
export const PORT_GRID: readonly string[] = [
  "TTgGggfgggTTgggggggg",
  "ttgggg<==>gggggTTggg",
  "gggfgg<==>ggfgggttgg",
  "ggggggWNDWgggggggggg",
  "FFFgggppppppppppgggg",
  "gSgggLpgBgpgXgpLgggf",
  "gggfggpggggpggpgGggg",
  "ggggggppppppppppgggg",
  "gggGgggggggpgggggfgg",
  "sssssssssspppsssssss",
  "wwwwwwwwwwpppwwwwwww",
  "wwwwwwwwwwwwwwwwwwww",
];
export const PORT_PREVIEW = mapSprite("python-port-preview", "PYTHON PORT (preview)", PYTHON_PORT_TILES, PORT_GRID, PORT_LEGEND);

/** Okafor's Lab: whiteboards and windows on the back wall, servers, desks, the Training Rig on a rug. */
export const LAB_LEGEND: TileLegend = {
  f: "floor", a: "floor-alt", w: "wall", b: "wall-base", n: "window", "[": "board-left", "]": "board-right", d: "desk-papers", m: "monitor",
  s: "server", P: "plant", k: "bookshelf", R: "rig", "(": "rug-left", r: "rug", ")": "rug-right", D: "door", c: "coffee",
};
export const LAB_GRID: readonly string[] = [
  "wnwwwnww[]wwnwwk",
  "wwwwwwwwwwwwwwwk",
  "bbbbbbbbbbbbbbbb",
  "PafafafafaffaffP",
  "afssfafmdffsssfa",
  "fafafa(rrr)afafc",
  "affmdf(rRr)fafaf",
  "fafafa(rrr)fafaf",
  "afadfafafafmdafa",
  "fPfafafafafafaPf",
  "bbbbbbbbDDbbbbbb",
];
export const LAB_PREVIEW = mapSprite("lab-preview", "OKAFOR'S LAB (preview)", LAB_TILES, LAB_GRID, LAB_LEGEND);
