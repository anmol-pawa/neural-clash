// Generates game/sprites/tiles/classic-grove-tiles.ts
// Classic Grove: an autumn orchard of decision trees. Trees are drawn as branching
// split-diagrams with leaf nodes, the path is a tidy data-table grid, signposts show a
// scatter plot with a fitted line, obelisks carry a two-colour cluster, and the arena
// pad is a k-means plate with two centroids. Original.
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
  k: "#1a1208",
  a: "#4a7a2a", b: "#6a9a38", c: "#8ab848", d: "#b4d870", // orchard grass
  e: "#6a4a2a", f: "#8a6a3c", h: "#b08a50", i: "#d8b878", // tilled-soil table path
  l: "#1a5a6a", m: "#2a8a96", n: "#62ccd2", o: "#d2f6f4", // pond
  p: "#3a2a1a", q: "#5a4228", r: "#8a6a44", // dark timber
  s: "#7a2a1a", t: "#b24a28", u: "#e08040", // terracotta roof
  v: "#d8cdb0", w: "#efe6cc", x: "#fffaea", // plaster
  y: "#ffb02a", z: "#5a6aff", // cluster A amber, cluster B blue
  1: "#ffe27a", 2: "#fff8d0",
  3: "#2a5a1a", 4: "#3a7a24", 5: "#5ea636", 6: "#8ad048", // tree canopy
  7: "#e0504a", 8: "#ffd27a", 9: "#6b6f86", g: "#9aa0b8", j: "#c8cde0",
};

function grass(c, seed, sway = 0, grid = true) {
  fillAll(c, "b");
  speckle(c, seed, ["a", "c", "a"], 24);
  if (grid) { // dice-pip scatter: faint 2/3/5 patterns pressed into the snow
    const r0 = rng(seed + 3);
    for (let i = 0; i < 3; i++) {
      const x = 2 + Math.floor(r0() * 11), y = 2 + Math.floor(r0() * 11);
      for (const [dx, dy] of i === 1 ? [[0, 0], [2, 2], [1, 1]] : [[0, 0], [2, 2]]) c.set(x + dx, y + dy, "a", -1);
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
function crystalTop(c, f) { // a decision tree: a root split fans to two child splits and four leaves
  grass(c, 21, 0, false);
  c.ellipse(8, 6, 7, 6, ["3", "4", "5", "5"]);
  c.rect(5, 3, 3, 2, "6"); c.rect(9, 7, 3, 2, "6");
  const ink = "k";
  c.line(8, 3, 4, 8, ink); c.line(8, 3, 12, 8, ink); // root to children
  c.line(4, 8, 2, 12, ink); c.line(4, 8, 6, 12, ink); c.line(12, 8, 10, 12, ink); c.line(12, 8, 14, 12, ink);
  c.rect(7, 2, 3, 3, "1"); c.rect(3, 7, 3, 3, "1"); c.rect(11, 7, 3, 3, "1"); // split nodes
  for (const x of [1, 5, 9, 13]) c.rect(x, 12, 3, 3, f && x === 5 ? "2" : "7"); // leaves (fruit)
  c.outline("k", null);
}
function crystalBase(c) {
  grass(c, 22, 0, false);
  c.ellipse(8, 3, 7, 4, ["3", "4", "5"]);
  for (const x of [2, 6, 10]) c.rect(x, 1, 3, 3, "7");
  c.rect(6, 4, 4, 9, "q"); c.rect(6, 4, 1, 9, "r"); c.rect(9, 4, 1, 9, "p");
  c.rect(4, 12, 8, 2, "r"); c.rect(4, 12, 8, 1, "h");
  c.outline("k", null);
}
function rail(c) { // orchard fence: posts and two rails
  grass(c, 31, 0);
  c.rect(0, 6, T, 2, "r"); c.rect(0, 6, T, 1, "i"); c.rect(0, 10, T, 2, "r"); c.rect(0, 10, T, 1, "i");
  for (const x of [0, 13]) { c.rect(x, 3, 3, 12, "q"); c.rect(x, 3, 3, 1, "h"); c.rect(x + 2, 3, 1, 12, "p"); }
  c.rect(0, 15, T, 1, "a");
}
function sign(c, f) { // signpost: a scatter plot with a fitted line
  grass(c, 41, 0, false);
  c.rect(7, 9, 2, 7, "q"); c.rect(7, 9, 1, 7, "r");
  c.rect(1, 1, 14, 9, "q"); c.rect(2, 2, 12, 7, "w");
  c.rect(2, 2, 12, 1, "x");
  c.line(3, 7, 12, 3, "z");
  for (const [x, y] of [[4, 6], [5, 7], [6, 4], [8, 5], [9, 3], [10, 5], [11, 2], [7, 6]]) c.set(x, y, "t", -1);
  if (f) c.set(11, 2, "1", -1);
  c.rect(5, 15, 6, 1, "a");
  c.outline("k", null);
}
function lamp(c, f) {
  path(c);
  c.rect(7, 5, 2, 10, "9"); c.rect(7, 5, 1, 10, "g");
  c.rect(5, 14, 6, 2, "9"); c.rect(5, 14, 6, 1, "g");
  c.rect(5, 1, 6, 5, f ? "2" : "1"); c.rect(6, 0, 4, 1, f ? "2" : "1"); // paper lantern
  c.rect(6, 2, 2, 2, "2");
  if (f) { c.set(3, 3, "1", -1); c.set(12, 3, "1", -1); }
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
function door(c, f) { // grove hut door: a glowing split-tree glyph
  wall(c);
  c.rect(2, 1, 12, 15, "p"); c.rect(3, 2, 10, 14, "q");
  c.rect(7, 2, 2, 14, "p");
  const g = f ? "2" : "1";
  c.line(8, 5, 5, 9, g); c.line(8, 5, 11, 9, g); c.line(5, 9, 4, 12, g); c.line(5, 9, 7, 12, g); c.line(11, 9, 9, 12, g); c.line(11, 9, 12, 12, g);
  c.rect(7, 4, 3, 2, g);
  c.rect(5, 1, 6, 1, "h");
}
function obelisk(c, f) { // stone pillar topped by a floating two-cluster scatter
  grass(c, 61, 0);
  c.rect(5, 8, 6, 8, "v"); c.rect(5, 8, 2, 8, "w"); c.rect(10, 8, 1, 8, "q");
  c.rect(4, 14, 8, 2, "g"); c.rect(4, 14, 8, 1, "j");
  const dy = f ? 1 : 0;
  for (const [x, y] of [[4, 3], [5, 5], [6, 2], [5, 3]]) c.set(x, y + dy, "y", -1);
  for (const [x, y] of [[9, 4], [10, 2], [11, 5], [10, 4]]) c.set(x, y + dy, "z", -1);
  c.set(5, 4 + dy, "1", -1); c.set(10, 3 + dy, "2", -1); // centroids
  c.outline("k", null, new Set(["y", "z", "1", "2"]));
}
function bench(c) {
  grass(c, 71, 0, false);
  c.rect(2, 7, 12, 3, "r"); c.rect(2, 7, 12, 1, "w"); c.rect(2, 9, 12, 1, "q");
  c.rect(2, 10, 2, 5, "q"); c.rect(12, 10, 2, 5, "q");
  c.rect(2, 4, 12, 2, "q"); c.rect(2, 4, 12, 1, "r");
  c.rect(2, 15, 12, 1, "a");
  c.outline("k", null);
}
function pad(c, f) { // the guardian's arena pad: a k-means plate with two centroids that blink
  path(c);
  c.rect(1, 1, 14, 14, "p"); c.rect(2, 2, 12, 12, "q");
  c.ellipse(8, 8, 5.5, 5.5, ["p", "r", "q", "r"]);
  for (const [x, y] of [[4, 5], [5, 7], [6, 5], [5, 4]]) c.set(x, y, "y", -1);
  for (const [x, y] of [[10, 9], [11, 11], [9, 10], [11, 8]]) c.set(x, y, "z", -1);
  c.set(5, 5, f ? "2" : "1", -1); c.set(10, 10, f ? "2" : "1", -1);
  c.line(7, 7, 8, 8, "h");
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
writeFileSync("game/sprites/tiles/classic-grove-tiles.ts", toModule({
  id: "classic-grove-tiles", name: "CLASSIC GROVE TILES", exportName: "CLASSIC_GROVE_TILES", w: T, h: T, palette: PAL, fps, anims,
  doc: "Classic Grove tileset, 16×16 opaque tiles (an autumn orchard, decision-tree trees, scatter-plot signs, cluster obelisks and a k-means arena pad). `idle` is an alias of `grass`.",
  generator: "scripts/art/classic-grove.mjs",
}));
console.log("wrote classic-grove tiles");
