// Generates game/sprites/tiles/recurrent-rapids-tiles.ts
// Recurrent Rapids: a river valley where everything loops. Water re-enters itself, the mill wheel
// turns, signboards carry a loop arrow with a hidden-state dot, and the arena pad is a ring of
// three cells with a state marker carried around it (the same weights, step after step). Original.
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
  k: "#0c1418",
  a: "#1c3a2a", b: "#2a5238", c: "#3c6c44", d: "#5c9456", // river-bank moss
  e: "#8a6a3c", f: "#a8844c", h: "#c8a468", i: "#e8cc90", // boardwalk planks
  l: "#0e4a68", m: "#1a78a0", n: "#4cb4d4", o: "#d8f4fc", // rapids
  p: "#3a2418", q: "#5a3a24", r: "#7c5434", // dark timber
  s: "#a4442c", t: "#cc6a3c", u: "#ec9a5c", // terracotta
  v: "#d8cdb0", w: "#ece4cc", x: "#fbf6e6", // plaster
  y: "#ffc83c", z: "#ff6a4a", // state dot amber and coral
  1: "#fff0a0", 2: "#fffbe0",
  3: "#2a6a5a", 4: "#3c9a7a", 5: "#6cc89a", 6: "#b4f0c4", // willow
  7: "#7a8a96", 8: "#a8b6c0", 9: "#5a6872", g: "#c4d0d8", j: "#e4ecf0",
};

function bank(c, seed, sway = 0, pebbles = true) { // mossy riverbank turf
  fillAll(c, "c");
  speckle(c, seed, ["b", "d", "b"], 24);
  speckle(c, seed + 7, ["a"], 4);
  if (pebbles) { const r = rng(seed + 3); const x = 2 + Math.floor(r() * 10), y = 2 + Math.floor(r() * 10); c.set(x, y, "8", -1); c.set(x + 1, y, "g", -1); c.set(x, y + 1, "9", -1); }
  if (sway) { c.set(4, 12, "d", -1); c.set(11, 3, "d", -1); }
}
function reeds(c, sway) { // reeds with amber cattails
  bank(c, 11, sway, false);
  for (const [x, h] of [[2, 9], [6, 11], [10, 8], [13, 10]]) {
    const lean = sway && x % 2 ? 1 : 0;
    c.rect(x, 15 - h, 1, h, "4"); c.rect(x + 1, 15 - h + 2, 1, h - 2, "3");
    c.rect(x + lean, 15 - h - 2, 2, 3, "r"); c.set(x + lean, 15 - h - 2, "y", -1);
  }
}
function planks(c) { // boardwalk
  fillAll(c, "f");
  for (let y = 0; y < T; y += 4) { c.rect(0, y, T, 1, "e"); c.rect(0, y + 1, T, 1, "h"); }
  for (let y = 0; y < T; y += 4) c.set(((y / 4) * 5 + 3) % T, y + 2, "p", -1);
  speckle(c, 17, ["e", "i"], 6);
}
function rapids(c, f) { // fast water with diagonal foam streaks that re-enter on the left
  fillAll(c, "m");
  for (const [y0, off] of [[1, 0], [6, 5], [11, 10]]) for (let x = 0; x < T; x++) {
    const p = (x + off + f * 4) % 16;
    if (p < 8) c.set(x, y0 + (p >> 2), p < 5 ? "n" : "o", -1);
    if (p < 3) c.set(x, y0 + 3, "l", -1);
  }
  speckle(c, 3 + f, ["l", "n"], 5);
}
function shoreline(c, f) {
  rapids(c, f);
  c.rect(0, 0, T, 4, "c", -1);
  speckle(c, 5, ["b", "d"], 6, [0, 0, 16, 3]);
  for (let x = 0; x < T; x++) { c.set(x, 4, (x + f * 2) % 4 < 2 ? "o" : "n", -1); c.set(x, 3, "a", -1); }
}
function willowTop(c, f) { // willow canopy with drooping fronds
  bank(c, 21, 0, false);
  c.disc(8, 6, 7, 5, "4", 1);
  c.disc(8, 5, 6, 4, "5", 2);
  for (const x of [2, 5, 8, 11, 13]) { const len = 6 + ((x * 7) % 4); c.rect(x, 8, 1, len + (f && x % 2 ? 1 : 0), "4"); c.set(x, 7 + len, "3", -1); }
  c.rect(5, 2, 3, 1, "6"); c.set(9, 3, "6", -1);
  if (f) c.set(11, 5, "6", -1);
  c.outline("k", null);
}
function trunk(c) { // willow trunk with roots
  bank(c, 22, 0, false);
  c.rect(5, 0, 6, 14, "r"); c.rect(5, 0, 2, 14, "e"); c.rect(10, 0, 1, 14, "p");
  c.rect(3, 12, 10, 3, "r"); c.rect(3, 12, 10, 1, "e");
  c.set(8, 4, "p", -1); c.set(7, 8, "p", -1);
  c.outline("k", null);
}
function rail(c) { // post and rope rail
  bank(c, 31, 0);
  for (const x of [1, 6, 11]) { c.rect(x, 5, 3, 9, "r"); c.rect(x, 5, 1, 9, "e"); }
  c.rect(0, 7, T, 1, "i"); c.rect(0, 8, T, 1, "e"); c.rect(0, 11, T, 1, "i"); c.rect(0, 12, T, 1, "e");
  c.outline("k", null);
}
function signboard(c, f) { // loop arrow with a hidden-state dot that hops around it
  bank(c, 41, 0, false);
  c.rect(7, 11, 2, 5, "q"); c.rect(7, 11, 1, 5, "r");
  c.rect(1, 1, 14, 11, "q"); c.rect(2, 2, 12, 9, "p");
  c.rect(2, 2, 12, 1, "r");
  const ring = [[5, 4], [6, 3], [8, 3], [9, 4], [10, 5], [10, 7], [9, 8], [8, 9], [6, 9], [5, 8], [4, 7], [4, 5]];
  for (const [x, y] of ring) c.set(x, y, "g", -1);
  c.set(9, 3, "g", -1); c.set(10, 3, "g", -1); c.set(10, 4, "g", -1); // arrow head
  const [dx, dy] = ring[f ? 8 : 2];
  c.set(dx, dy, "y", -1); c.set(dx, dy, "y", -1);
  c.rect(5, 15, 6, 1, "a");
  c.outline("k", null);
}
function lantern(c, f) { // hanging lantern on a post
  planks(c);
  c.rect(7, 6, 2, 10, "r"); c.rect(7, 6, 1, 10, "e");
  c.rect(5, 14, 6, 2, "9"); c.rect(5, 14, 6, 1, "8");
  c.rect(4, 1, 8, 6, "q"); c.rect(5, 2, 6, 4, f ? "2" : "1"); c.rect(5, 2, 2, 4, f ? "1" : "y");
  c.rect(4, 0, 8, 1, "p");
  if (f) { c.set(2, 3, "1", -1); c.set(13, 3, "1", -1); }
  c.outline("k", null);
}
function roof(c, part) { // terracotta tiles
  fillAll(c, "t");
  for (let y = 0; y < T; y += 4) {
    c.rect(0, y + 3, T, 1, "s"); c.rect(0, y, T, 1, "u");
    for (let x = (y / 4) % 2 ? 4 : 0; x < T; x += 8) c.rect(x, y + 1, 1, 3, "s");
  }
  if (part === "l") { c.rect(0, 0, 1, T, "k"); c.rect(1, 0, 1, T, "s"); }
  if (part === "r") { c.rect(15, 0, 1, T, "k"); c.rect(14, 0, 1, T, "s"); }
}
function wall(c) { // plaster with timber studs
  fillAll(c, "w");
  for (let x = 0; x < T; x += 8) c.rect(x, 0, 1, T, "r");
  c.rect(0, 0, T, 1, "x"); c.rect(0, 15, T, 1, "v");
  speckle(c, 9, ["v"], 5);
}
function windowTile(c, f) { // window with a looping reflection
  wall(c);
  c.rect(3, 2, 10, 11, "p"); c.rect(4, 3, 8, 9, "l");
  c.rect(4, 3, 8, 1, "m");
  const ring = [[5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [10, 6], [10, 7], [10, 8], [9, 8], [8, 8], [7, 8], [6, 8], [5, 8], [5, 7], [5, 6]];
  for (const [x, y] of ring) c.set(x, y, "n", -1);
  const [dx, dy] = ring[f ? 10 : 2]; c.set(dx, dy, "y", -1);
  c.rect(2, 13, 12, 2, "r");
}
function door(c, f) { // door with a loop glyph
  wall(c);
  c.rect(2, 1, 12, 15, "p"); c.rect(3, 2, 10, 14, "q");
  c.rect(7, 2, 2, 14, "p");
  const g = f ? "1" : "y";
  for (const [x, y] of [[4, 6], [5, 5], [6, 5], [9, 5], [10, 5], [11, 6], [11, 8], [10, 9], [9, 9], [6, 9], [5, 9], [4, 8]]) c.rect(x, y, 1, 1, g);
  c.rect(5, 1, 6, 1, "u");
}
function wheel(c, f) { // mill wheel: eight spokes, rotating a half-step per frame, on a stone mount
  bank(c, 61, 0);
  c.rect(3, 13, 10, 3, "9"); c.rect(3, 13, 10, 1, "g");
  c.disc(8, 7, 7, 7, "r", 1); c.disc(8, 7, 5, 5, "p", 2);
  const a0 = f ? Math.PI / 8 : 0;
  for (let i = 0; i < 8; i++) {
    const a = a0 + (i * Math.PI) / 4;
    c.line(8, 7, Math.round(8 + Math.cos(a) * 6), Math.round(7 + Math.sin(a) * 6), "i", 3);
    c.set(Math.round(8 + Math.cos(a) * 6), Math.round(7 + Math.sin(a) * 6), "y", -1);
  }
  c.rect(7, 6, 2, 2, "9");
  c.outline("k", null, new Set(["y"]));
}
function bench(c) { // timber bench
  bank(c, 71, 0, false);
  c.rect(2, 7, 12, 3, "h"); c.rect(2, 7, 12, 1, "i"); c.rect(2, 9, 12, 1, "e");
  c.rect(2, 10, 2, 5, "r"); c.rect(12, 10, 2, 5, "r");
  c.rect(2, 4, 12, 2, "e"); c.rect(2, 4, 12, 1, "f");
  c.rect(2, 15, 12, 1, "a");
  c.outline("k", null);
}
function pad(c, f) { // arena pad: ring of 3 cells, the state marker hops to the next cell each frame
  planks(c);
  c.rect(1, 1, 14, 14, "p"); c.rect(2, 2, 12, 12, "l");
  const cells = [[3, 3], [10, 3], [6, 9]];
  for (const [x, y] of cells) c.rect(x, y, 3, 3, "m");
  c.line(6, 4, 9, 4, "n", -1); c.line(11, 6, 8, 9, "n", -1); c.line(6, 10, 4, 6, "n", -1);
  const [x, y] = cells[f % 3];
  c.rect(x, y, 3, 3, f % 2 ? "z" : "y"); c.set(x + 1, y + 1, "2", -1);
  c.outline("k", null);
}

const tiles = {
  grass: frames((c, f) => bank(c, 1, f), 2),
  "grass-alt": frames((c, f) => bank(c, 2, f), 2),
  flowers: frames(reeds, 2),
  path: [tile(planks)],
  water: frames(rapids, 4),
  shore: frames(shoreline, 4),
  "tree-top": frames(willowTop, 2),
  "tree-trunk": [tile(trunk)],
  fence: [tile(rail)],
  sign: frames(signboard, 2),
  lamp: frames(lantern, 2),
  "roof-left": [tile((c) => roof(c, "l"))],
  roof: [tile((c) => roof(c, "c"))],
  "roof-right": [tile((c) => roof(c, "r"))],
  wall: [tile(wall)],
  window: frames(windowTile, 2),
  door: frames(door, 2),
  statue: frames(wheel, 2),
  bench: [tile(bench)],
  pad: frames(pad, 3),
};
const anims = { idle: tiles.grass, ...tiles };
const fps = Object.fromEntries(Object.keys(anims).map((k) => [k, k === "idle" ? 2 : anims[k].length === 4 ? 4 : anims[k].length === 3 ? 3 : 2]));
writeFileSync("game/sprites/tiles/recurrent-rapids-tiles.ts", toModule({
  id: "recurrent-rapids-tiles", name: "RECURRENT RAPIDS TILES", exportName: "RECURRENT_RAPIDS_TILES", w: T, h: T, palette: PAL, fps, anims,
  doc: "Recurrent Rapids tileset, 16×16 opaque tiles (a river valley of loops: mossy banks, willows, rapids that re-enter themselves, boardwalks, a turning mill wheel, loop-arrow signboards and a three-cell arena pad with a hopping state marker). `idle` is an alias of `grass`.",
  generator: "scripts/art/recurrent-rapids.mjs",
}));
console.log("wrote recurrent rapids tiles");
