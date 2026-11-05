import { mapSprite, type TileLegend } from "./tilemap";
import { PYTHON_PORT_TILES } from "./tiles/python-port-tiles";
import { LAB_TILES } from "./tiles/lab-tiles";
import { VECTOR_VALE_TILES } from "./tiles/vector-vale-tiles";
import { GRADIENT_GORGE_TILES } from "./tiles/gradient-gorge-tiles";
import { PROBABILITY_PEAKS_TILES } from "./tiles/probability-peaks-tiles";

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

/** Vector Vale: a crystal valley with a shrine, basis obelisks and the guardian's arena pad. */
export const VALE_LEGEND: TileLegend = {
  g: "grass", G: "grass-alt", f: "flowers", p: "path", w: "water", s: "shore", T: "tree-top", t: "tree-trunk",
  F: "fence", S: "sign", L: "lamp", "<": "roof-left", "=": "roof", ">": "roof-right", W: "wall", N: "window", D: "door", X: "statue", B: "bench", A: "pad",
};
export const VALE_GRID: readonly string[] = [
  "TTgGggfgggTTgggggggg",
  "ttgggg<==>gggggTTggg",
  "gggfgg<==>ggfgggttgg",
  "ggggggWNDWgggggggggg",
  "FFFgggppppppppppgggg",
  "gSgggLpgBgpgXgpLgggf",
  "gggfggpggggpggpgGggg",
  "ggggggppppppAAppgggg",
  "gggGgggggggpAAgggfgg",
  "sssssssssspppsssssss",
  "wwwwwwwwwwpppwwwwwww",
  "wwwwwwwwwwwwwwwwwwww",
];
export const VALE_PREVIEW = mapSprite("vector-vale-preview", "VECTOR VALE (preview)", VECTOR_VALE_TILES, VALE_GRID, VALE_LEGEND);

/** Gradient Gorge: a canyon with a descent river, contour-etched ground, rock spires and the guardian's pad. Same tile names as the Vale. */
export const GORGE_LEGEND: TileLegend = VALE_LEGEND;
export const GORGE_GRID: readonly string[] = [
  "TTgGggfgggTTgggggggg",
  "ttgggg<==>gggggTTggg",
  "gggfgg<==>ggfgggttgg",
  "ggggggWNDWgggggggggg",
  "FFFgggppppppppppgggg",
  "gSgggLpgBgpgXgpLgggf",
  "gggfggpggggpggpgGggg",
  "ggggggppppppAAppgggg",
  "gggGgggggggpAAgggfgg",
  "sssssssssspppsssssss",
  "wwwwwwwwwwpppwwwwwww",
  "wwwwwwwwwwwwwwwwwwww",
];
export const GORGE_PREVIEW = mapSprite("gradient-gorge-preview", "GRADIENT GORGE (preview)", GRADIENT_GORGE_TILES, GORGE_GRID, GORGE_LEGEND);

/** Probability Peaks: a snow ridge with a glacier-melt stream, ice crags, bell-curve trail signs and the guardian's pad. Same tile names as the Vale. */
export const PEAKS_LEGEND: TileLegend = VALE_LEGEND;
export const PEAKS_GRID: readonly string[] = [
  "TTTgggggggggggggTTTg",
  "ttTggfggg<==>gggttTg",
  "gggggggggg<==>ggggfg",
  "gfggggggWNDWgggggggg",
  "gggLppppppppppppLggg",
  "FFFgpgggBgggggpgggFF",
  "gSggpggfggGgggpggSgg",
  "ggggppppppAAppppgggg",
  "gGgggggfgpAAgggggfgg",
  "sssssssssspppsssssss",
  "wwwwwwwwwwpppwwwwwww",
  "wwwwwwwwwwwwwwwwwwww",
];
export const PEAKS_PREVIEW = mapSprite("probability-peaks-preview", "PROBABILITY PEAKS (preview)", PROBABILITY_PEAKS_TILES, PEAKS_GRID, PEAKS_LEGEND);
