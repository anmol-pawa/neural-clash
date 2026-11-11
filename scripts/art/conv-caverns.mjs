// Generates game/sprites/tiles/conv-caverns-tiles.ts
// Conv Caverns: a crystal cave where a 3x3 window scans the floor. Rock is gridded like an image,
// crystals glow in feature-map colours, the pillar carries a sliding window and the arena pad is a
// 6x6 grid with a 3x3 kernel sweeping across it. Original.
// scatter, and the arena pad is a 2-3-1 network whose hidden units pulse. Original.
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
  k: "#0a0e18",
  a: "#1c2430", b: "#2a3442", c: "#3c4a5c", d: "#5a6c80", // cave rock
  e: "#181c34", f: "#262c52", h: "#3c4478", i: "#6470b0", // deep blue stone
  l: "#0c3040", m: "#126070", n: "#30c0c0", o: "#c0fcf0", // underground stream
  p: "#201620", q: "#3c2c3c", r: "#604858", // dark timber
  s: "#1a6a6a", t: "#2aa8a0", u: "#70e8d0", // teal crystal
  v: "#b0b8c8", w: "#d8dce8", x: "#f4f6fc", // pale limestone
  y: "#ffb040", z: "#ff5a9a", // kernel amber and magenta feature
  1: "#ffe08a", 2: "#fffbe0",
  3: "#282044", 4: "#4a3a80", 5: "#7a68c0", 6: "#b8a8f0", // violet crystal
  7: "#e85a7a", 8: "#c8e8f0", 9: "#586880", g: "#8498b0", j: "#c4d2e0",
};

function rock(c, seed, sway = 0, grid = true) { // cave floor with a faint pixel-grid, like an image
  fillAll(c, "b");
  speckle(c, seed, ["a", "c", "a"], 22);
  speckle(c, seed + 7, ["d"], 3);
  if (grid) {
    const r0 = rng(seed + 3);
    const x = 2 + Math.floor(r0() * 8), y = 2 + Math.floor(r0() * 8);
    c.rect(x, y, 4, 1, "c"); c.rect(x, y + 3, 4, 1, "c"); c.rect(x, y, 1, 4, "c"); c.rect(x + 3, y, 1, 4, "c");
  }
  if (sway) { c.set(4, 12, "d", -1); c.set(11, 3, "d", -1); }
}
function crystals(c, sway) { // small crystal clusters (flower tile)
  rock(c, 11, sway, false);
  for (const [x, y, col, hi] of [[2, 3, "t", "u"], [10, 2, "5", "6"], [4, 10, "5", "6"], [11, 10, "t", "u"]]) {
    c.rect(x + 1, y, 2, 5, col); c.rect(x, y + 2, 1, 3, col); c.rect(x + 3, y + 3, 1, 2, col);
    c.set(x + 1, y - 1 + sway, hi, -1); c.set(x + 1, y, hi, -1); c.set(x + 1, y + 1, hi, -1);
  }
}
function slab(c) { // path: flagstone drawn as a 4x4 grid of pixels, one lit cell
  fillAll(c, "e");
  c.rect(0, 0, T, 1, "f"); c.rect(0, 0, 1, T, "f"); c.rect(8, 0, 1, T, "f"); c.rect(0, 8, T, 1, "f");
  c.rect(4, 4, 1, 1, "h"); c.rect(12, 12, 1, 1, "h"); c.rect(12, 4, 1, 1, "h");
  c.rect(3, 11, 3, 3, "h"); c.set(3, 11, "i", -1);
  speckle(c, 17, ["f", "h"], 6);
}
function stream(c, f) { // underground stream with ripples
  fillAll(c, "m");
  for (const [y0, off] of [[2, 0], [7, 6], [12, 11]]) for (let x = 0; x < T; x++) {
    const p = (x + off + f * 4) % 16;
    if (p < 6) c.set(x, y0, "n", -1);
    if (p === 4) { c.set(x, y0 - 1, "o", -1); c.set(x + 1, y0, "o", -1); }
    if (p < 3) c.set(x, y0 + 1, "l", -1);
  }
  speckle(c, 3 + f, ["l"], 4);
  if (f % 2) c.set(11, 4, "o", -1); // a glint
}
function bank(c, f) {
  stream(c, f);
  c.rect(0, 0, T, 4, "b", -1);
  speckle(c, 5, ["a", "c"], 6, [0, 0, 16, 3]);
  for (let x = 0; x < T; x++) { c.set(x, 4, (x + f) % 3 === 0 ? "o" : "n", -1); c.set(x, 3, "a", -1); }
}
function crystalTop(c, f) { // a large violet crystal cluster
  rock(c, 21, 0, false);
  for (const [x, w, top, col] of [[2, 4, 3, "4"], [6, 5, 0, "5"], [11, 3, 4, "4"]]) {
    c.rect(x, top + 2, w, 13 - top, col);
    c.rect(x + 1, top, w - 2, 2, col);
    c.rect(x, top + 2, 1, 13 - top, "3");
    c.rect(x + 1, top + 1, 1, 9, "6");
  }
  c.rect(7, 2, 1, 2, "6"); c.rect(7, 3, 1, 1, "x", -1);
  c.rect(7, 12, 3, 3, "3");
  if (f) { c.set(8, 1, "2", -1); c.set(3, 6, "6", -1); } else { c.set(12, 7, "6", -1); c.set(8, 5, "2", -1); }
  c.outline("k", null);
}
function pillar(c) { // rock stalagmite base (tree-trunk)
  rock(c, 22, 0, false);
  c.rect(5, 0, 6, 14, "c"); c.rect(5, 0, 2, 14, "d"); c.rect(10, 0, 1, 14, "a");
  c.rect(3, 12, 10, 3, "c"); c.rect(3, 12, 10, 1, "d");
  c.rect(7, 3, 2, 1, "n"); c.rect(7, 7, 2, 1, "n"); c.rect(7, 10, 2, 1, "n"); // banded mineral veins
  c.outline("k", null);
}
function stalagmites(c) { // low spiky wall
  rock(c, 31, 0);
  c.rect(0, 9, T, 5, "c"); c.rect(0, 9, T, 1, "d"); c.rect(0, 13, T, 1, "a");
  for (let x = 1; x < T; x += 4) {
    c.rect(x, 5, 3, 4, "c"); c.rect(x + 1, 3, 1, 2, "c"); c.rect(x, 5, 1, 4, "d"); c.set(x + 1, 3, "d", -1);
  }
  c.outline("k", null);
}
function sign(c, f) { // a 5x5 image with a 3x3 kernel window sliding over it
  rock(c, 41, 0, false);
  c.rect(7, 11, 2, 5, "q"); c.rect(7, 11, 1, 5, "r");
  c.rect(1, 1, 14, 11, "q"); c.rect(2, 2, 12, 9, "p");
  c.rect(2, 2, 12, 1, "r");
  for (let gy = 0; gy < 4; gy++) for (let gx = 0; gx < 4; gx++) c.rect(3 + gx * 2 + (gx > 1 ? 1 : 0), 3 + gy * 2, 1, 1, (gx + gy) % 2 ? "9" : "g");
  const ox = f ? 6 : 3;
  c.rect(ox - 1, 3, 1, 5, "y"); c.rect(ox + 4, 3, 1, 5, "y"); c.rect(ox - 1, 3, 6, 1, "y"); c.rect(ox - 1, 7, 6, 1, "y");
  c.rect(5, 15, 6, 1, "a");
  c.outline("k", null);
}
function lamp(c, f) { // glowing teal crystal on a stalk
  slab(c);
  c.rect(7, 7, 2, 8, "9"); c.rect(7, 7, 1, 8, "g");
  c.rect(5, 14, 6, 2, "9"); c.rect(5, 14, 6, 1, "g");
  c.rect(6, 2, 4, 6, f ? "u" : "t"); c.rect(7, 0, 2, 2, f ? "o" : "u"); c.rect(6, 2, 1, 5, f ? "o" : "u");
  c.set(7, 3, "2", -1);
  if (f) { c.set(3, 3, "u", -1); c.set(13, 3, "u", -1); }
  c.outline("k", null);
}
function roof(c, part) { // teal slate plates
  fillAll(c, "s");
  for (let y = 0; y < T; y += 4) {
    c.rect(0, y + 3, T, 1, "l"); c.rect(0, y, T, 1, "t");
    for (let x = (y / 4) % 2 ? 4 : 0; x < T; x += 8) c.rect(x, y + 1, 1, 3, "l");
  }
  if (part === "l") { c.rect(0, 0, 1, T, "k"); c.rect(1, 0, 1, T, "l"); }
  if (part === "r") { c.rect(15, 0, 1, T, "k"); c.rect(14, 0, 1, T, "l"); }
}
function wall(c) { // pale limestone blocks
  fillAll(c, "w");
  for (let y = 0; y < T; y += 5) c.rect(0, y + 4, T, 1, "v");
  for (let y = 0; y < 3; y++) c.rect(((y * 5) % 11) + 2, y * 5, 1, 4, "v");
  c.rect(0, 0, T, 1, "x"); c.rect(0, 15, T, 1, "q");
}
function windowTile(c, f) { // window showing a tiny 3x3 pixel grid with a moving lit cell
  wall(c);
  c.rect(3, 2, 10, 11, "p"); c.rect(4, 3, 8, 9, "e");
  for (let gy = 0; gy < 3; gy++) for (let gx = 0; gx < 3; gx++) {
    const lit = gy * 3 + gx === (f ? 4 : 0);
    c.rect(5 + gx * 2, 4 + gy * 2 + gy, 2, 2, lit ? "y" : "h");
  }
  c.rect(2, 13, 12, 2, "r");
}
function door(c, f) { // arched door with a glowing 3x3 kernel glyph
  wall(c);
  c.rect(2, 1, 12, 15, "p"); c.rect(3, 2, 10, 14, "q");
  c.rect(7, 2, 2, 14, "p");
  const g = f ? "1" : "y";
  for (let gy = 0; gy < 3; gy++) for (let gx = 0; gx < 3; gx++) if ((gx + gy) % 2 === 0) c.rect(4 + gx * 3, 5 + gy * 3, 2, 2, g);
  c.rect(5, 1, 6, 1, "t");
}
function scanner(c, f) { // pillar of stacked blocks with a window that scans up and down
  rock(c, 61, 0);
  c.rect(5, 2, 6, 14, "v"); c.rect(5, 2, 2, 14, "w"); c.rect(10, 2, 1, 14, "g");
  c.rect(4, 14, 8, 2, "g"); c.rect(4, 14, 8, 1, "j");
  for (let y = 5; y < 13; y += 3) c.rect(5, y, 6, 1, "v");
  const wy = f ? 8 : 3;
  c.rect(4, wy, 8, 4, "y"); c.rect(5, wy + 1, 6, 2, f ? "1" : "p");
  c.outline("k", null, new Set(["y", "1"]));
}
function bench(c) { // rock bench
  rock(c, 71, 0, false);
  c.rect(2, 7, 12, 3, "d"); c.rect(2, 7, 12, 1, "w"); c.rect(2, 9, 12, 1, "c");
  c.rect(2, 10, 2, 5, "c"); c.rect(12, 10, 2, 5, "c");
  c.rect(2, 4, 12, 2, "c"); c.rect(2, 4, 12, 1, "d");
  c.rect(2, 15, 12, 1, "a");
  c.outline("k", null);
}
function pad(c, f) { // arena pad: 6x6 grid, a 3x3 kernel window sweeps it
  slab(c);
  c.rect(1, 1, 14, 14, "p"); c.rect(2, 2, 12, 12, "e");
  for (let gy = 0; gy < 4; gy++) for (let gx = 0; gx < 4; gx++) c.rect(3 + gx * 2 + gx, 3 + gy * 2 + gy, 2, 2, "f");
  const ox = f ? 1 : 0, oy = f ? 1 : 0;
  const x0 = 3 + ox * 3 - 1, y0 = 3 + oy * 3 - 1;
  c.rect(x0, y0, 7, 1, "y"); c.rect(x0, y0 + 6, 7, 1, "y"); c.rect(x0, y0, 1, 7, "y"); c.rect(x0 + 6, y0, 1, 7, "y");
  c.rect(x0 + 2, y0 + 2, 3, 3, f ? "z" : "n");
  c.outline("k", null);
}

const tiles = {
  grass: frames((c, f) => rock(c, 1, f), 2),
  "grass-alt": frames((c, f) => rock(c, 2, f), 2),
  flowers: frames(crystals, 2),
  path: [tile(slab)],
  water: frames(stream, 4),
  shore: frames(bank, 4),
  "tree-top": frames(crystalTop, 2),
  "tree-trunk": [tile(pillar)],
  fence: [tile(stalagmites)],
  sign: frames(sign, 2),
  lamp: frames(lamp, 2),
  "roof-left": [tile((c) => roof(c, "l"))],
  roof: [tile((c) => roof(c, "c"))],
  "roof-right": [tile((c) => roof(c, "r"))],
  wall: [tile(wall)],
  window: frames(windowTile, 2),
  door: frames(door, 2),
  statue: frames(scanner, 2),
  bench: [tile(bench)],
  pad: frames(pad, 2),
};
const anims = { idle: tiles.grass, ...tiles };
const fps = Object.fromEntries(Object.keys(anims).map((k) => [k, k === "idle" ? 2 : anims[k].length === 4 ? 4 : 2]));
writeFileSync("game/sprites/tiles/conv-caverns-tiles.ts", toModule({
  id: "conv-caverns-tiles", name: "CONV CAVERNS TILES", exportName: "CONV_CAVERNS_TILES", w: T, h: T, palette: PAL, fps, anims,
  doc: "Conv Caverns tileset, 16×16 opaque tiles (a crystal cave: pixel-gridded rock, violet crystal clusters, an underground stream, signboards with a sliding 3×3 window, a scanner pillar and a 6×6 arena pad swept by a kernel). `idle` is an alias of `grass`.",
  generator: "scripts/art/conv-caverns.mjs",
}));
console.log("wrote conv caverns tiles");
