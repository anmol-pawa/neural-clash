// Generates game/sprites/tiles/probability-peaks-tiles.ts
// Probability Peaks: a snowy alpine ridge at twilight. The snowfield is dusted with dice-pip
// scatter, ice crags stand in for trees, bell-curve signs and die-topped obelisks mark the trail. Original.
import { writeFileSync } from "node:fs";
import { Canvas, toModule } from "./raster.mjs";

const T = 16;
const rng = (seed) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const tile = (fn) => { const c = new Canvas(T, T); fn(c); return c.rows(); };
const frames = (fn, n) => Array.from({ length: n }, (_, i) => tile((c) => fn(c, i)));
const fillAll = (c, ch) => c.rect(0, 0, T, T, ch);
const speckle = (c, seed, chars, n, region = [0, 0, T, T]) => {
  const r = rng(seed);
  for (let i = 0; i < n; i++) c.set(region[0] + Math.floor(r() * region[2]), region[1] + Math.floor(r() * region[3]), chars[Math.floor(r() * chars.length)], -1);
};

const PAL = {
  k: "#0e1426",
  a: "#5a6a92", b: "#8296c0", c: "#b0c2e4", d: "#e4eefc", // snow (blue-shadowed)
  e: "#4a4a62", f: "#6e6e8a", h: "#9a9ab4", i: "#cacadc", // flagstone path
  l: "#18405e", m: "#2a6f96", n: "#6ac4e0", o: "#dcf6ff", // glacier melt
  p: "#26203c", q: "#40355c", r: "#6a5a8a", // dark slate
  s: "#5a2a5a", t: "#8a3e7a", u: "#c46aa0", // plum roof
  v: "#a6a0c0", w: "#cfcae4", x: "#f2eefc", // pale stone
  y: "#ffd86a", z: "#ff6a8a", // gold bell curve, rose tail
  1: "#ffe08a", 2: "#fffbe0",
  3: "#2c4a6a", 4: "#4a7898", 5: "#78b0cc", 6: "#bce4f0", // ice crag
  7: "#7af0b0", 8: "#ffd0e0", 9: "#6b6f86", g: "#9aa0b8", j: "#c8cde0",
};

function grass(c, seed, sway = 0, grid = true) {
  fillAll(c, "b");
  speckle(c, seed, ["a", "c", "a"], 24);
  if (grid) { // dice-pip scatter: clusters of 1-5 dots, like samples drawn from a distribution
    const rr = rng(seed + 3);
    for (let i = 0; i < 3; i++) {
      const cx = 2 + Math.floor(rr() * 11), cy = 2 + Math.floor(rr() * 11), n = 1 + Math.floor(rr() * 4);
      for (let j = 0; j < n; j++) c.set(cx + Math.floor(rr() * 3) - 1, cy + Math.floor(rr() * 3) - 1, "d", -1);
    }
  }
  const r = rng(seed + 7);
  for (let i = 0; i < 4; i++) {
    const x = 1 + Math.floor(r() * 13), y = 3 + Math.floor(r() * 11);
    c.set(x, y, "a", -1); c.set(x + (sway ? 1 : 0), y - 1, "c", -1); c.set(x, y - 1, sway ? "b" : "c", -1);
  }
}
function flowers(c, sway) { // little glow-bells
  grass(c, 11, sway);
  for (const [x, y, col] of [[3, 4, "5"], [10, 3, "8"], [6, 10, "8"], [12, 11, "5"], [2, 13, "6"]]) {
    const dx = sway ? 1 : 0;
    c.set(x + dx, y, col, -1); c.set(x + dx, y - 1, col, -1); c.set(x + dx - 1, y, col, -1); c.set(x + dx + 1, y, col, -1);
    c.set(x, y + 1, "a", -1); c.set(x, y + 2, "a", -1);
  }
}
function path(c) { // square slabs with a bright seam: a lattice
  fillAll(c, "e");
  for (let by = 0; by < 2; by++) for (let bx = 0; bx < 2; bx++) {
    const x = bx * 8, y = by * 8;
    c.rect(x + 1, y + 1, 7, 7, "f", -1);
    c.rect(x + 1, y + 1, 7, 1, "h", -1); c.rect(x + 1, y + 1, 1, 7, "h", -1);
    c.set(x + 1, y + 1, "i", -1);
    c.rect(x + 7, y + 2, 1, 6, "e", -1);
  }
  speckle(c, 9, ["e", "h"], 5);
}
function stream(c, f) {
  fillAll(c, "m");
  for (const [y0, off] of [[2, 0], [7, 6], [12, 11]]) for (let x = 0; x < T; x++) {
    const p = (x + off + f * 4) % 16;
    if (p < 6) c.set(x, y0, "n", -1);
    if (p === 4) { c.set(x, y0 - 1, "o", -1); c.set(x + 1, y0, "o", -1); } // arrow-head ripples
    if (p < 3) c.set(x, y0 + 1, "l", -1);
  }
  speckle(c, 3 + f, ["l"], 4);
}
function shore(c, f) {
  stream(c, f);
  c.rect(0, 0, T, 4, "b", -1);
  speckle(c, 5, ["a", "c"], 6, [0, 0, 16, 3]);
  for (let x = 0; x < T; x++) { c.set(x, 4, (x + f) % 3 === 0 ? "o" : "n", -1); c.set(x, 3, "a", -1); }
}
function crystalTop(c, f) { // tall crystal cluster, top half
  grass(c, 21, 0, false);
  c.rect(5, 6, 6, 10, "4"); c.rect(5, 6, 2, 10, "5"); c.rect(10, 6, 1, 10, "3");
  for (let i = 0; i < 6; i++) c.rect(8 - i, 6 - i, 1 + i * 2, 1, i < 2 ? "6" : "5"); // pointed tip
  c.line(8, 0, 8, 6, "6"); c.set(7, 1, "5", -1);
  c.rect(1, 9, 4, 7, "4"); c.rect(1, 9, 1, 7, "5"); c.rect(2, 8, 2, 1, "5"); c.rect(3, 7, 1, 1, "6");
  c.rect(11, 8, 4, 8, "3"); c.rect(11, 8, 1, 8, "4"); c.rect(12, 7, 2, 1, "4"); c.rect(13, 6, 1, 1, "5");
  if (f) { c.set(6, 3, "2", -1); c.set(7, 2, "2", -1); } else { c.set(7, 4, "2", -1); c.set(6, 5, "2", -1); }
  c.outline("k", null);
}
function crystalBase(c) {
  grass(c, 22, 0, false);
  c.rect(5, 0, 6, 11, "4"); c.rect(5, 0, 2, 11, "5"); c.rect(10, 0, 1, 11, "3");
  c.rect(1, 0, 4, 6, "4"); c.rect(1, 0, 1, 6, "5");
  c.rect(11, 0, 4, 8, "3"); c.rect(11, 0, 1, 8, "4");
  c.rect(3, 11, 10, 3, "q"); c.rect(3, 11, 10, 1, "r"); c.rect(4, 14, 8, 1, "p");
  c.rect(3, 14, 10, 2, "a");
  c.outline("k", null);
}
function rail(c) { // axis rail: a metal bar with tick marks
  grass(c, 31, 0);
  c.rect(0, 6, T, 3, "r"); c.rect(0, 6, T, 1, "w"); c.rect(0, 8, T, 1, "q");
  for (let x = 1; x < T; x += 4) c.rect(x, 4, 1, 2, "w");
  for (const x of [0, 13]) { c.rect(x, 4, 3, 10, "q"); c.rect(x, 4, 3, 1, "w"); c.rect(x + 2, 4, 1, 10, "p"); }
  c.rect(0, 14, T, 1, "a");
}
function sign(c, f) { // trail sign: a gold bell curve with rose tails
  grass(c, 41, 0, false);
  c.rect(7, 9, 2, 7, "q"); c.rect(7, 9, 1, 7, "r");
  c.rect(1, 1, 14, 9, "q"); c.rect(2, 2, 12, 7, "p");
  c.rect(2, 2, 12, 1, "r");
  const ys = [8, 8, 7, 6, 4, 3, 3, 4, 6, 7, 8, 8];
  ys.forEach((y, i) => c.set(2 + i, y, i < 2 || i > 9 ? "z" : "y", -1));
  c.line(2, 8, 13, 8, "z");
  if (f) c.set(8, 3, "2", -1);
  c.rect(5, 15, 6, 1, "a");
  c.outline("k", null);
}
function lamp(c, f) {
  path(c);
  c.rect(7, 5, 2, 10, "9"); c.rect(7, 5, 1, 10, "g");
  c.rect(5, 14, 6, 2, "9"); c.rect(5, 14, 6, 1, "g");
  c.rect(5, 1, 6, 5, f ? "6" : "5"); c.rect(6, 0, 4, 1, f ? "6" : "5"); // crystal lantern
  c.rect(6, 2, 2, 2, "2");
  if (f) { c.set(3, 3, "6", -1); c.set(12, 3, "6", -1); }
  c.outline("k", null);
}
function roof(c, part) {
  fillAll(c, "t");
  for (let y = 0; y < T; y += 4) {
    c.rect(0, y + 3, T, 1, "s"); c.rect(0, y, T, 1, "u");
    for (let x = (y / 4) % 2 ? 4 : 0; x < T; x += 8) c.rect(x, y + 1, 1, 3, "s");
  }
  if (part === "l") { c.rect(0, 0, 1, T, "k"); c.rect(1, 0, 1, T, "s"); }
  if (part === "r") { c.rect(15, 0, 1, T, "k"); c.rect(14, 0, 1, T, "s"); }
}
function wall(c) {
  fillAll(c, "w");
  for (let y = 0; y < T; y += 5) { c.rect(0, y + 4, T, 1, "v"); }
  for (let y = 0; y < 3; y++) c.rect(((y * 5) % 11) + 2, y * 5, 1, 4, "v");
  c.rect(0, 0, T, 1, "x"); c.rect(0, 15, T, 1, "q");
}
function windowTile(c, f) { // window showing a 2x2 grid of light
  wall(c);
  c.rect(3, 2, 10, 11, "p"); c.rect(4, 3, 8, 9, f ? "2" : "1");
  c.rect(7, 3, 2, 9, "p"); c.rect(4, 7, 8, 2, "p");
  c.rect(4, 3, 3, 1, "2");
  c.rect(2, 13, 12, 2, "r");
}
function door(c, f) { // shrine door: a glowing sigma glyph
  wall(c);
  c.rect(2, 1, 12, 15, "p"); c.rect(3, 2, 10, 14, "q");
  c.rect(7, 2, 2, 14, "p");
  const g = f ? "6" : "5";
  c.rect(4, 4, 8, 1, g, -1); c.rect(4, 12, 8, 1, g, -1);
  c.line(4, 4, 8, 8, g, -1); c.line(8, 8, 4, 12, g, -1);
  c.rect(5, 1, 6, 1, "5");
}
function obelisk(c, f) { // stone pillar topped by a floating die that shows a new face
  grass(c, 61, 0);
  c.rect(5, 8, 6, 8, "v"); c.rect(5, 8, 2, 8, "w"); c.rect(10, 8, 1, 8, "q");
  c.rect(4, 14, 8, 2, "g"); c.rect(4, 14, 8, 1, "j");
  const dy = f ? 1 : 0;
  c.rect(5, 1 + dy, 6, 6, "x"); c.rect(5, 6 + dy, 6, 1, "w"); c.rect(10, 1 + dy, 1, 6, "w");
  const pips = f ? [[6, 2], [9, 5], [7, 3], [8, 4]] : [[6, 2], [9, 5], [9, 2], [6, 5]];
  for (const [x, y] of pips) c.set(x, y + dy, "z", -1);
  c.set(8, 10, "y", -1); c.set(8, 12, "y", -1);
  c.outline("k", null, new Set(["y"]));
}
function bench(c) {
  grass(c, 71, 0, false);
  c.rect(2, 7, 12, 3, "r"); c.rect(2, 7, 12, 1, "w"); c.rect(2, 9, 12, 1, "q");
  c.rect(2, 10, 2, 5, "q"); c.rect(12, 10, 2, 5, "q");
  c.rect(2, 4, 12, 2, "q"); c.rect(2, 4, 12, 1, "r");
  c.rect(2, 15, 12, 1, "a");
  c.outline("k", null);
}
function pad(c, f) { // the guardian's arena pad: concentric rings that pulse
  path(c);
  c.rect(1, 1, 14, 14, "p"); c.rect(2, 2, 12, 12, "q");
  c.ellipse(8, 8, 5.5, 5.5, ["l", "m", f ? "n" : "m", "n"]);
  c.line(8, 3, 8, 13, f ? "o" : "n"); c.line(3, 8, 13, 8, f ? "o" : "n");
  c.set(8, 8, "2", -1);
  c.outline("k", null);
}

const tiles = {
  grass: frames((c, f) => grass(c, 1, f), 2),
  "grass-alt": frames((c, f) => grass(c, 2, f), 2),
  flowers: frames(flowers, 2),
  path: [tile(path)],
  water: frames(stream, 4),
  shore: frames(shore, 4),
  "tree-top": frames(crystalTop, 2),
  "tree-trunk": [tile(crystalBase)],
  fence: [tile(rail)],
  sign: frames(sign, 2),
  lamp: frames(lamp, 2),
  "roof-left": [tile((c) => roof(c, "l"))],
  roof: [tile((c) => roof(c, "c"))],
  "roof-right": [tile((c) => roof(c, "r"))],
  wall: [tile(wall)],
  window: frames(windowTile, 2),
  door: frames(door, 2),
  statue: frames(obelisk, 2),
  bench: [tile(bench)],
  pad: frames(pad, 2),
};
const anims = { idle: tiles.grass, ...tiles };
const fps = Object.fromEntries(Object.keys(anims).map((k) => [k, k === "idle" ? 2 : anims[k].length === 4 ? 4 : 2]));
writeFileSync("game/sprites/tiles/probability-peaks-tiles.ts", toModule({
  id: "probability-peaks-tiles", name: "PROBABILITY PEAKS TILES", exportName: "PROBABILITY_PEAKS_TILES", w: T, h: T, palette: PAL, fps, anims,
  doc: "Probability Peaks tileset, 16×16 opaque tiles (a twilight snow ridge dusted with dice-pip scatter, ice crags for trees, bell-curve signs, die-topped obelisks and a glowing arena pad). `idle` is an alias of `grass`.",
  generator: "scripts/art/probability-peaks.mjs",
}));
console.log("wrote probability-peaks tiles");
