// Generates game/sprites/tiles/gradient-gorge-tiles.ts
// Gradient Gorge: a dusk canyon whose ground is etched with contour lines,
// rock spires stand in for trees, and downhill-arrow obelisks mark the descent. Original.
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
  k: "#1c0f14",
  a: "#6a3a28", b: "#9a5a34", c: "#c47c42", d: "#e8b068", // canyon dust
  e: "#5a4a5a", f: "#7e6a78", h: "#a89098", i: "#d8c4c0", // cut-stone path
  l: "#124a5c", m: "#1f7a86", n: "#4cc0c0", o: "#c8f6f0", // meltwater river
  p: "#3a2430", q: "#5a3a44", r: "#8a5e60", // dark iron
  s: "#7a2c2c", t: "#a84a3a", u: "#d27a52", // terracotta roof
  v: "#b09080", w: "#d8bca6", x: "#f4e6d6", // sandstone
  y: "#7cf0a0", z: "#ff7a3a", // arrows: descent green, gradient orange
  1: "#ffd27a", 2: "#fff4cc",
  3: "#4a2a2a", 4: "#7a4a3a", 5: "#a86a4a", 6: "#d8a078", // rock spire
  7: "#5ae08a", 8: "#ffe27a", 9: "#6b6f86", g: "#9aa0b8", j: "#c8cde0",
};

function grass(c, seed, sway = 0, grid = true) {
  fillAll(c, "b");
  speckle(c, seed, ["a", "c", "a"], 24);
  if (grid) { // etched contour lines: concentric height rings under the dust
    for (let x = 0; x < T; x++) {
      const y1 = Math.round(4 + 2 * Math.sin((x + seed) / 2.4)), y2 = Math.round(11 + 2 * Math.sin((x + seed) / 2.4));
      c.set(x, y1, "c", -1); c.set(x, y2, "c", -1);
    }
  }
  const r = rng(seed + 7);
  for (let i = 0; i < 4; i++) {
    const x = 1 + Math.floor(r() * 13), y = 3 + Math.floor(r() * 11);
    c.set(x, y, "a", -1); c.set(x + (sway ? 1 : 0), y - 1, "d", -1); c.set(x, y - 1, sway ? "c" : "d", -1);
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
function sign(c, f) { // basis signpost: gold arrow → and rose arrow ↑
  grass(c, 41, 0, false);
  c.rect(7, 9, 2, 7, "q"); c.rect(7, 9, 1, 7, "r");
  c.rect(1, 1, 14, 9, "q"); c.rect(2, 2, 12, 7, "p");
  c.rect(2, 2, 12, 1, "r");
  c.line(5, 3, 5, 8, "y"); c.line(5, 8, 3, 6, "y"); c.line(5, 8, 7, 6, "y");
  c.line(9, 3, 13, 8, "z"); c.line(13, 8, 10, 8, "z"); c.line(13, 8, 13, 5, "z");
  if (f) c.set(3, 3, "8", -1);
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
function door(c, f) { // shrine door: a glowing nabla glyph
  wall(c);
  c.rect(2, 1, 12, 15, "p"); c.rect(3, 2, 10, 14, "q");
  c.rect(7, 2, 2, 14, "p");
  const g = f ? "6" : "5";
  for (let i = 0; i < 6; i++) { c.rect(4 + i, 5 + i, 8 - 2 * i, 1, g, -1); } // ∇
  c.rect(5, 1, 6, 1, "5");
}
function obelisk(c, f) { // stone pillar topped by a floating basis arrow
  grass(c, 61, 0);
  c.rect(5, 8, 6, 8, "v"); c.rect(5, 8, 2, 8, "w"); c.rect(10, 8, 1, 8, "q");
  c.rect(4, 14, 8, 2, "g"); c.rect(4, 14, 8, 1, "j");
  const dy = f ? 1 : 0;
  c.line(8, 1 + dy, 8, 6 + dy, "y"); c.line(8, 6 + dy, 6, 4 + dy, "y"); c.line(8, 6 + dy, 10, 4 + dy, "y");
  c.set(8, 10, "z", -1); c.set(8, 12, "z", -1);
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
writeFileSync("game/sprites/tiles/gradient-gorge-tiles.ts", toModule({
  id: "gradient-gorge-tiles", name: "GRADIENT GORGE TILES", exportName: "GRADIENT_GORGE_TILES", w: T, h: T, palette: PAL, fps, anims,
  doc: "Gradient Gorge tileset, 16×16 opaque tiles (a dusk canyon etched with contour lines, rock spires for trees, downhill-arrow obelisks and a glowing arena pad). `idle` is an alias of `grass`.",
  generator: "scripts/art/gradient-gorge.mjs",
}));
console.log("wrote gradient-gorge tiles");
