// Generates game/tiles/tileset.ts: the Python Port outdoor tiles and the Lab
// interior tiles (16x16, shared palette, animated water / lamps / screens /
// server LEDs). Original designs: a harbour town of cobbles, quays and
// lantern posts, and a lab of slate walls, wood floors and glowing monitors.
// Run: node scripts/art/tiles.mjs
import { writeFileSync } from "node:fs";
import { Canvas } from "./raster.mjs";

const palette = {
  k: "#150f26", w: "#ffffff",
  // grass (dark..light)
  a: "#2f6b3a", b: "#3f8a45", c: "#58a851", d: "#7cc468",
  // stone
  e: "#5f5873", f: "#807a93", g: "#a29cb2", h: "#c4bfd2",
  // water + foam
  i: "#1c5f8f", j: "#2a80b4", l: "#4aa5d0", m: "#8fd3ea", n: "#e8f8ff",
  // wood
  o: "#4f301c", p: "#73492a", q: "#9a6a3c", r: "#c08c52",
  // roof (red clay)
  s: "#6f2538", t: "#9a3a4c", u: "#c45a5c", v: "#e48c7a",
  // plaster
  A: "#a89880", B: "#c9b99c", C: "#e3d6b8", D: "#f4ead2",
  // tree leaves
  E: "#1d4a2e", F: "#2a6a3a", G: "#3d8a47", H: "#6ab35a",
  // metal
  I: "#232840", J: "#3c4468", L: "#626b96", M: "#9aa3c8",
  // screens
  N: "#0e3a4a", O: "#1fa5b5", P: "#6df0f7",
  // leds
  Q: "#5cf07a", R: "#f0c040", S: "#f0504a",
  // interior floor
  T: "#3a3f66", U: "#4d5384", V: "#666da6",
  // interior wall
  W: "#26204a", X: "#37306a", Y: "#4d478b", Z: "#7a74b8",
  // rug
  0: "#6e2650", 1: "#9a3d72", 2: "#c8639a", 3: "#ee9cc0",
  // flowers, paper, ink
  4: "#f07ab0", 5: "#f4d34a", 6: "#7aa0f0", 7: "#efe6cf", 8: "#2b3a67",
  // dock rope, book spines
  9: "#c9b27a",
};

let seed = 1;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const T = () => new Canvas(16, 16);

/** Fill the whole tile with a ramp, scattering lighter / darker specks. */
function textured(c, ramp, { dark = 0.12, light = 0.1, s = 1 } = {}) {
  seed = s * 7919;
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const r = rnd();
      c.set(x, y, r < dark ? ramp[0] : r > 1 - light ? ramp[3] : r > 0.55 ? ramp[2] : ramp[1], 0);
    }
}

// ---------- outdoor ground ----------
const grass = (v) => {
  const c = T();
  textured(c, ["a", "b", "c", "d"], { dark: 0.1, light: 0.06, s: 3 + v });
  // blades
  seed = 40 + v * 13;
  for (let i = 0; i < 5; i++) {
    const x = Math.floor(rnd() * 14) + 1, y = Math.floor(rnd() * 12) + 2;
    c.set(x, y, "d", 1);
    c.set(x, y - 1, "d", 1);
  }
  if (v === 2) for (const [x, y, f] of [[3, 4, "4"], [11, 3, "5"], [8, 11, "6"], [13, 12, "4"], [4, 12, "5"]]) {
    c.set(x, y, f, 2);
    c.set(x, y + 1, "b", 2);
  }
  return c.rows();
};

const cobble = (v) => {
  const c = T();
  c.rect(0, 0, 16, 16, "e");
  // staggered stones with highlight top/left and shade bottom/right
  const rows = [[0, [0, 5, 11]], [5, [2, 8, 13]], [10, [0, 6, 11]]];
  for (const [y0, xs] of rows)
    xs.forEach((x0, i) => {
      const x1 = (xs[i + 1] ?? xs[0] + 16) - 1;
      for (let y = y0; y < Math.min(16, y0 + 5); y++)
        for (let x = x0; x <= x1; x++) {
          const xx = x % 16;
          const edgeB = y === y0 + 4 || xx === x1 % 16;
          const edgeT = y === y0 || x === x0;
          c.set(xx, y, edgeB ? "e" : edgeT ? "h" : (x + y + v) % 7 === 0 ? "f" : "g", 0);
        }
    });
  return c.rows();
};

const quay = () => {
  const c = T();
  textured(c, ["f", "g", "g", "h"], { dark: 0.08, light: 0.08, s: 9 });
  // sea-facing lip: lit top edge of the front face, deep shadow under it
  c.rect(0, 10, 16, 1, "h");
  c.rect(0, 11, 16, 3, "f");
  c.rect(0, 14, 16, 2, "e");
  for (const x of [3, 8, 13]) c.rect(x, 11, 1, 3, "e");
  c.rect(0, 15, 16, 1, "i");
  return c.rows();
};

const plank = () => {
  const c = T();
  for (let y = 0; y < 16; y++) {
    const band = Math.floor(y / 4);
    for (let x = 0; x < 16; x++) c.set(x, y, y % 4 === 3 ? "o" : (x + band * 5) % 13 === 0 ? "p" : band % 2 ? "q" : "r", 0);
  }
  for (const [x, y] of [[2, 1], [13, 1], [5, 5], [11, 9], [3, 13], [12, 13]]) c.set(x, y, "o", 1);
  return c.rows();
};

const waterFrame = (f) => {
  const c = T();
  textured(c, ["i", "j", "j", "l"], { dark: 0.12, light: 0.04, s: 21 });
  // travelling wave crests
  for (const [row, ph] of [[2, 0], [7, 5], [12, 10]]) {
    for (let x = 0; x < 16; x++) {
      const t = (x + f * 4 + ph) % 16;
      if (t < 5) c.set(x, row + (t === 0 || t === 4 ? 1 : 0), t === 2 ? "n" : "m", 1);
    }
  }
  return c.rows();
};

// ---------- outdoor objects (transparent background) ----------
function outlined(c) {
  c.outline("k", null);
  return c.rows();
}

const treeTop = () => {
  const c = T();
  c.ellipse(8, 9, 7.2, 7.4, ["F", "G", "H", "H"]);
  c.ellipse(4.5, 11, 4.5, 4, ["E", "F", "G", "G"]);
  c.ellipse(11.5, 11.5, 4.5, 4, ["E", "F", "G", "G"]);
  c.ellipse(7, 6, 3.4, 2.6, ["G", "H", "H", "d"]);
  for (const [x, y] of [[5, 9], [10, 7], [8, 12], [12, 10]]) c.set(x, y, "E", 5);
  return outlined(c);
};
const treeTrunk = () => {
  const c = T();
  c.ellipse(8, 0, 6.5, 4, ["E", "F", "F", "G"], { clip: (x, y) => y < 3 });
  c.rect(6, 0, 4, 12, "p");
  c.rect(6, 0, 1, 12, "q");
  c.rect(9, 0, 1, 12, "o");
  c.rect(5, 11, 6, 2, "p");
  c.rect(5, 11, 6, 1, "q");
  c.rect(2, 13, 12, 3, "b"); // root shadow on grass
  c.rect(2, 13, 12, 1, "a");
  return outlined(c);
};
const bush = () => {
  const c = T();
  c.ellipse(8, 11, 7, 5, ["F", "G", "H", "H"]);
  c.ellipse(5, 10, 3.5, 3, ["G", "H", "H", "d"]);
  for (const [x, y] of [[10, 9], [7, 12], [12, 12]]) c.set(x, y, "E", 5);
  for (const [x, y] of [[4, 8], [11, 10]]) c.set(x, y, "4", 6);
  return outlined(c);
};
const fence = () => {
  const c = T();
  c.rect(1, 6, 3, 9, "q");
  c.rect(1, 6, 1, 9, "r");
  c.rect(12, 6, 3, 9, "q");
  c.rect(12, 6, 1, 9, "r");
  c.rect(0, 8, 16, 2, "r");
  c.rect(0, 9, 16, 1, "p");
  c.rect(0, 12, 16, 2, "r");
  c.rect(0, 13, 16, 1, "p");
  return outlined(c);
};
const crate = () => {
  const c = T();
  c.rect(2, 3, 12, 12, "q");
  c.rect(2, 3, 12, 1, "r");
  c.rect(2, 3, 1, 12, "r");
  c.rect(2, 14, 12, 1, "o");
  c.rect(13, 3, 1, 12, "o");
  c.rect(2, 8, 12, 2, "p");
  for (let i = 0; i < 10; i++) {
    c.set(3 + i, 4 + i, "p", 3);
  }
  c.rect(7, 9, 2, 2, "R");
  return outlined(c);
};
const barrel = () => {
  const c = T();
  c.ellipse(8, 9, 6, 7, ["o", "p", "q", "r"]);
  c.rect(2, 5, 12, 1, "L");
  c.rect(2, 12, 12, 1, "L");
  c.rect(2, 4, 12, 1, "M");
  c.ellipse(8, 3, 4.5, 1.8, ["q", "r", "r", "r"]);
  return outlined(c);
};
const bollard = () => {
  const c = T();
  c.rect(5, 6, 6, 8, "J");
  c.rect(5, 6, 2, 8, "L");
  c.ellipse(8, 6, 4, 2, ["L", "M", "M", "M"]);
  c.rect(4, 13, 8, 2, "I");
  c.line(11, 8, 15, 11, "9");
  c.line(11, 9, 15, 12, "9");
  return outlined(c);
};
const lampTop = (f) => {
  const c = T();
  c.rect(7, 8, 2, 8, "J");
  c.rect(7, 8, 1, 8, "L");
  c.rect(4, 2, 8, 6, "I");
  c.rect(5, 3, 6, 4, f ? "R" : "R");
  c.rect(6, 4, 4, 2, f ? "n" : "5");
  c.rect(3, 1, 10, 1, "J");
  c.rect(5, 0, 6, 1, "L");
  if (f) {
    for (const [x, y] of [[2, 4], [13, 4], [3, 2], [12, 2]]) c.set(x, y, "5", 9);
  }
  return outlined(c);
};
const lampBase = () => {
  const c = T();
  c.rect(7, 0, 2, 12, "J");
  c.rect(7, 0, 1, 12, "L");
  c.rect(5, 12, 6, 3, "I");
  c.rect(5, 12, 6, 1, "L");
  return outlined(c);
};
const sign = () => {
  const c = T();
  c.rect(7, 8, 2, 7, "p");
  c.rect(2, 2, 12, 7, "q");
  c.rect(2, 2, 12, 1, "r");
  c.rect(2, 8, 12, 1, "o");
  // arrow glyph: ">>" for "this way"
  c.line(5, 4, 8, 5, "o"); c.line(8, 5, 5, 6, "o");
  c.line(8, 4, 11, 5, "o"); c.line(11, 5, 8, 6, "o");
  return outlined(c);
};

// ---------- buildings ----------
const roof = (kind) => {
  const c = T();
  const lower = kind.startsWith("low");
  c.rect(0, 0, 16, 16, "t");
  // tile courses
  for (let row = 0; row < 4; row++) {
    const y = row * 4;
    c.rect(0, y + 3, 16, 1, "s");
    for (let x = (row % 2) * 4; x < 16; x += 8) c.rect(x, y, 1, 3, "s");
    c.rect(0, y, 16, 1, "u");
  }
  c.set(3, 1, "v", 1); c.set(11, 5, "v", 1); c.set(7, 9, "v", 1); c.set(13, 13, "v", 1);
  if (kind.endsWith("l")) { c.rect(0, 0, 1, 16, "s"); c.rect(1, 0, 1, 16, "u"); }
  if (kind.endsWith("r")) { c.rect(15, 0, 1, 16, "s"); c.rect(14, 0, 1, 16, "t"); }
  if (!lower) c.rect(0, 0, 16, 1, "v"); // ridge highlight
  if (lower) {
    c.rect(0, 14, 16, 2, "s"); // eave shadow
    c.rect(0, 13, 16, 1, "v");
  }
  return c.rows();
};
const wallBase = (c) => {
  textured(c, ["A", "B", "C", "C"], { dark: 0.06, light: 0.05, s: 31 });
  c.rect(0, 15, 16, 1, "A");
  c.rect(0, 0, 16, 1, "A");
};
const wall = () => {
  const c = T();
  wallBase(c);
  return c.rows();
};
const window_ = (f) => {
  const c = T();
  wallBase(c);
  c.rect(3, 2, 10, 10, "o");
  c.rect(4, 3, 8, 8, f ? "R" : "r");
  c.rect(4, 3, 8, 3, f ? "5" : "R");
  c.rect(7, 3, 2, 8, "o");
  c.rect(4, 6, 8, 1, "o");
  c.rect(2, 12, 12, 2, "q");
  c.rect(2, 12, 12, 1, "r");
  return c.rows();
};
const door = () => {
  const c = T();
  wallBase(c);
  c.rect(3, 1, 10, 15, "o");
  c.ellipse(8, 3, 5, 3, ["o", "o", "o", "o"]);
  c.rect(4, 3, 8, 13, "q");
  c.rect(4, 3, 1, 13, "r");
  c.rect(11, 3, 1, 13, "p");
  c.rect(7, 3, 2, 13, "p");
  c.set(10, 9, "R", 7);
  c.set(5, 7, "p", 7); c.set(5, 12, "p", 7);
  return c.rows();
};
const labSign = () => {
  const c = T();
  wallBase(c);
  c.rect(1, 3, 14, 10, "I");
  c.rect(1, 3, 14, 1, "L");
  c.rect(1, 12, 14, 1, "J");
  // a tiny 2-2-1 network glyph
  const nodes = [[4, 6], [4, 10], [8, 5], [8, 8], [8, 11], [12, 8]];
  const edge = (a, b) => c.line(nodes[a][0], nodes[a][1], nodes[b][0], nodes[b][1], "O", 8);
  [[0, 2], [0, 3], [1, 3], [1, 4], [2, 5], [3, 5], [4, 5]].forEach(([a, b]) => edge(a, b));
  for (const [x, y] of nodes) { c.rect(x - 1, y - 1, 3, 3, "P", 9); c.set(x, y, "n", 10); }
  return c.rows();
};

// ---------- interior ----------
const floorWood = () => {
  const c = T();
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const plank = Math.floor(x / 8);
      c.set(x, y, x % 8 === 7 ? "o" : (y + plank * 7) % 16 === 0 ? "p" : (y * 5 + plank * 3) % 9 === 0 && x % 8 > 1 && x % 8 < 6 ? "p" : plank ? "q" : "r", 0);
    }
  c.rect(0, 15, 16, 1, "p");
  return c.rows();
};
const floorTile = () => {
  const c = T();
  c.rect(0, 0, 16, 16, "U");
  c.rect(0, 0, 8, 8, "V");
  c.rect(8, 8, 8, 8, "V");
  c.rect(0, 0, 16, 1, "T");
  c.rect(0, 8, 16, 1, "T");
  c.rect(0, 0, 1, 16, "T");
  c.rect(8, 0, 1, 16, "T");
  c.set(3, 3, "Z", 1); c.set(11, 11, "Z", 1);
  return c.rows();
};
const wallIn = () => {
  const c = T();
  textured(c, ["W", "X", "X", "Y"], { dark: 0.1, light: 0.05, s: 77 });
  c.rect(0, 0, 16, 1, "Z");
  for (let y = 4; y < 16; y += 6) c.rect(0, y, 16, 1, "W");
  return c.rows();
};
const wallBase2 = () => {
  const c = T();
  textured(c, ["W", "X", "X", "Y"], { dark: 0.1, light: 0.05, s: 78 });
  c.rect(0, 11, 16, 5, "o");
  c.rect(0, 11, 16, 1, "r");
  c.rect(0, 12, 16, 3, "p");
  c.rect(0, 15, 16, 1, "o");
  return c.rows();
};
const windowIn = () => {
  const c = T();
  textured(c, ["W", "X", "X", "Y"], { dark: 0.1, light: 0.05, s: 79 });
  c.rect(2, 1, 12, 11, "o");
  c.rect(3, 2, 10, 9, "j");
  c.rect(3, 2, 10, 4, "l");
  c.rect(3, 2, 3, 2, "n");
  c.rect(8, 7, 5, 4, "i");
  c.rect(7, 2, 2, 9, "o");
  c.rect(3, 6, 10, 1, "o");
  c.rect(1, 12, 14, 2, "q");
  c.rect(1, 12, 14, 1, "r");
  return c.rows();
};
const desk = (side) => {
  const c = T();
  c.rect(0, 6, 16, 4, "r");
  c.rect(0, 6, 16, 1, "7");
  c.rect(0, 10, 16, 2, "q");
  c.rect(0, 12, 16, 1, "o");
  const legs = side === "l" ? [1, 12] : [3, 14];
  for (const x of legs) c.rect(x, 12, 2, 4, "p");
  if (side === "l") {
    c.rect(0, 6, 1, 7, "r");
    // papers
    c.rect(8, 4, 5, 3, "7");
    c.line(9, 5, 12, 5, "8");
  } else {
    // mug
    c.rect(4, 3, 4, 4, "w");
    c.rect(4, 3, 4, 1, "g");
    c.set(8, 4, "w", 3); c.set(8, 5, "w", 3);
    c.rect(5, 2, 2, 1, "n");
  }
  return outlined(c);
};
const monitor = (f) => {
  const c = T();
  c.rect(6, 12, 4, 3, "J");
  c.rect(4, 14, 8, 2, "I");
  c.rect(1, 1, 14, 11, "I");
  c.rect(1, 1, 14, 1, "L");
  c.rect(2, 2, 12, 9, "N");
  // scrolling code lines
  const lines = [[3, 5], [5, 8], [3, 4], [6, 9], [4, 6]];
  for (let r = 0; r < 4; r++) {
    const [x0, len] = lines[(r + f) % lines.length];
    c.rect(2 + x0 - 1, 3 + r * 2, len, 1, r === f % 4 ? "P" : "O");
  }
  if (f % 2 === 0) c.rect(11, 9, 2, 1, "n"); // cursor
  return outlined(c);
};
const server = (f) => {
  const c = T();
  c.rect(2, 0, 12, 16, "J");
  c.rect(2, 0, 12, 1, "M");
  c.rect(2, 0, 1, 16, "L");
  c.rect(13, 0, 1, 16, "I");
  for (let u = 0; u < 3; u++) {
    const y = 2 + u * 5;
    c.rect(4, y, 8, 4, "I");
    c.rect(4, y, 8, 1, "J");
    for (let k = 0; k < 4; k++) c.set(5 + k * 2, y + 2, (k + u + f) % 3 === 0 ? "Q" : (k + u + f) % 3 === 1 ? "R" : "e", 11);
    c.set(11, y + 1, f % 2 ? "S" : "e", 12);
  }
  return outlined(c);
};
const whiteboard = (half) => {
  const c = T();
  c.rect(0, 1, 16, 13, "M");
  c.rect(0, 1, 16, 1, "w");
  c.rect(half === "l" ? 1 : 0, 2, half === "l" ? 15 : 15, 11, "w");
  c.rect(0, 13, 16, 1, "L");
  if (half === "l") {
    // y = wx + b, drawn as a line fit through dots
    c.line(3, 11, 15, 5, "8");
    for (const [x, y] of [[4, 8], [6, 11], [8, 6], [10, 9], [12, 4], [14, 8]]) c.rect(x, y, 2, 2, "S");
  } else {
    c.line(0, 5, 3, 5, "8");
    c.line(3, 5, 6, 10, "8");
    c.line(6, 10, 9, 5, "8");
    c.line(9, 5, 12, 10, "8");
    c.rect(2, 3, 1, 1, "6");
    c.rect(10, 11, 4, 1, "O");
  }
  c.rect(half === "l" ? 3 : 1, 14, 6, 2, "L"); // marker tray
  return half === "l" ? outlined(c) : outlined(c);
};
const bookshelf = () => {
  const c = T();
  c.rect(0, 0, 16, 16, "p");
  c.rect(0, 0, 16, 1, "r");
  const cols = ["S", "6", "R", "Q", "4", "O", "5"];
  for (const y0 of [2, 9]) {
    c.rect(1, y0, 14, 5, "o");
    let x = 1;
    seed = y0 * 17;
    while (x < 15) {
      const w = 1 + Math.floor(rnd() * 2);
      const h = 3 + Math.floor(rnd() * 2);
      const col = cols[Math.floor(rnd() * cols.length)];
      c.rect(x, y0 + 5 - h, w, h, col);
      c.set(x, y0 + 5 - h, "w", 13);
      x += w + (rnd() < 0.2 ? 1 : 0);
    }
    c.rect(0, y0 + 5, 16, 1, "q");
  }
  return outlined(c);
};
const plant = () => {
  const c = T();
  c.rect(5, 10, 6, 5, "u");
  c.rect(5, 10, 6, 1, "v");
  c.rect(4, 9, 8, 2, "t");
  for (const [x1, y1, x2, y2] of [[8, 9, 3, 2], [8, 9, 8, 0], [8, 9, 13, 3], [8, 9, 5, 5], [8, 9, 11, 6]]) {
    c.line(x1, y1, x2, y2, "G");
    c.line(x1 + 1, y1, x2 + 1, y2, "H");
  }
  return outlined(c);
};
const rug = (kind) => {
  const c = T();
  c.rect(0, 0, 16, 16, "1");
  if (kind === "edge") {
    c.rect(0, 0, 16, 3, "0");
    c.rect(0, 3, 16, 1, "3");
    c.rect(0, 5, 16, 11, "1");
    for (let x = 1; x < 16; x += 4) c.set(x, 9, "2", 1);
  } else {
    seed = 5;
    for (let y = 0; y < 16; y += 4) for (let x = (y / 4 % 2) * 2; x < 16; x += 4) { c.set(x, y, "2", 1); c.set(x + 1, y + 1, "2", 1); }
  }
  return c.rows();
};
const chair = () => {
  const c = T();
  c.rect(4, 3, 8, 6, "J");
  c.rect(4, 3, 8, 1, "M");
  c.rect(3, 9, 10, 3, "L");
  c.rect(3, 9, 10, 1, "M");
  c.rect(7, 12, 2, 3, "I");
  c.rect(4, 14, 8, 1, "I");
  return outlined(c);
};
const doormat = () => {
  const c = T();
  c.rect(0, 0, 16, 16, "U");
  c.rect(2, 3, 12, 10, "o");
  c.rect(3, 4, 10, 8, "q");
  for (let x = 3; x < 13; x += 2) c.rect(x, 4, 1, 8, "p");
  return c.rows();
};
const exitDoor = () => {
  const c = T();
  textured(c, ["W", "X", "X", "Y"], { dark: 0.1, light: 0.05, s: 80 });
  c.rect(2, 0, 12, 16, "o");
  c.rect(3, 1, 10, 15, "q");
  c.rect(3, 1, 1, 15, "r");
  c.rect(8, 1, 1, 15, "p");
  c.rect(11, 8, 2, 2, "R");
  c.rect(5, 3, 2, 4, "m"); // glass
  c.rect(10, 3, 2, 4, "m");
  return c.rows();
};

// ---------- registry ----------
const tiles = {
  // name: [frames[], fps, solid, layer]
  grass: [[grass(0)], 0, false, "ground"],
  grass2: [[grass(1)], 0, false, "ground"],
  "grass-flowers": [[grass(2)], 0, false, "ground"],
  cobble: [[cobble(0)], 0, false, "ground"],
  cobble2: [[cobble(1)], 0, false, "ground"],
  quay: [[quay()], 0, true, "ground"],
  plank: [[plank()], 0, false, "ground"],
  water: [[0, 1, 2, 3].map(waterFrame), 3, true, "ground"],
  "tree-top": [[treeTop()], 0, true, "object"],
  "tree-trunk": [[treeTrunk()], 0, true, "object"],
  bush: [[bush()], 0, true, "object"],
  fence: [[fence()], 0, true, "object"],
  crate: [[crate()], 0, true, "object"],
  barrel: [[barrel()], 0, true, "object"],
  bollard: [[bollard()], 0, true, "object"],
  "lamp-top": [[lampTop(0), lampTop(1)], 1.5, true, "object"],
  "lamp-base": [[lampBase()], 0, true, "object"],
  sign: [[sign()], 0, true, "object"],
  "roof-tl": [[roof("topl")], 0, true, "building"],
  "roof-tm": [[roof("topm")], 0, true, "building"],
  "roof-tr": [[roof("topr")], 0, true, "building"],
  "roof-bl": [[roof("lowl")], 0, true, "building"],
  "roof-bm": [[roof("lowm")], 0, true, "building"],
  "roof-br": [[roof("lowr")], 0, true, "building"],
  wall: [[wall()], 0, true, "building"],
  window: [[window_(0), window_(1)], 1, true, "building"],
  door: [[door()], 0, false, "building"],
  "lab-sign": [[labSign()], 0, true, "building"],
  "floor-wood": [[floorWood()], 0, false, "ground"],
  "floor-tile": [[floorTile()], 0, false, "ground"],
  "wall-in": [[wallIn()], 0, true, "building"],
  "wall-base": [[wallBase2()], 0, true, "building"],
  "window-in": [[windowIn()], 0, true, "building"],
  "desk-l": [[desk("l")], 0, true, "object"],
  "desk-r": [[desk("r")], 0, true, "object"],
  monitor: [[0, 1, 2, 3].map(monitor), 2, true, "object"],
  server: [[0, 1, 2].map(server), 3, true, "object"],
  "whiteboard-l": [[whiteboard("l")], 0, true, "object"],
  "whiteboard-r": [[whiteboard("r")], 0, true, "object"],
  bookshelf: [[bookshelf()], 0, true, "object"],
  plant: [[plant()], 0, true, "object"],
  rug: [[rug("mid")], 0, false, "ground"],
  "rug-edge": [[rug("edge")], 0, false, "ground"],
  chair: [[chair()], 0, true, "object"],
  doormat: [[doormat()], 0, false, "ground"],
  "exit-door": [[exitDoor()], 0, false, "building"],
};

const names = Object.keys(tiles);
const pal = Object.entries(palette).map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(",\n");
const body = names
  .map((n) => {
    const [frames, fps, solid, layer] = tiles[n];
    const fr = frames.map((f) => `      [\n${f.map((r) => `        "${r}"`).join(",\n")},\n      ]`).join(",\n");
    return `    ${JSON.stringify(n)}: { solid: ${solid}, layer: ${JSON.stringify(layer)}, fps: ${fps}, frames: [\n${fr},\n    ] }`;
  })
  .join(",\n");
writeFileSync(
  "game/tiles/tileset.ts",
  `// Generated by scripts/art/tiles.mjs, then committed. Edit freely.
import type { TileSet } from "./tiles";

/** Python Port harbour tiles and the Lab interior, 16×16, shared palette. */
export const TILESET: TileSet = {
  id: "python-port",
  size: 16,
  palette: {
${pal},
  },
  tiles: {
${body},
  },
};
`,
);
console.log("wrote", names.length, "tiles");
