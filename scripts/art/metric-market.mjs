// Generates game/sprites/tiles/metric-market-tiles.ts
// Metric Market: a sunlit bazaar of striped awnings. The floor is a 2x2 confusion-matrix
// mosaic, signboards plot an ROC curve, pillars hold balance scales and the arena pad is a
// threshold dial. Original.
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
  k: "#1c1424",
  a: "#a8885a", b: "#c8a874", c: "#e0c490", d: "#f4e0b0", // sandstone plaza
  e: "#4a3a52", f: "#6a5878", h: "#8e7ca0", i: "#b8a8cc", // slate mosaic
  l: "#1a4a78", m: "#2a78a8", n: "#5ac4e0", o: "#d0f4f8", // canal
  p: "#2a1a20", q: "#4e3226", r: "#7e5a40", // timber
  s: "#8a2a30", t: "#c8483c", u: "#f08a60", // terracotta roof
  v: "#d8c8a8", w: "#efe2c4", x: "#fff6dc", // plaster
  y: "#32d4a8", z: "#ff7a3c", // TP/TN teal and FP/FN orange
  1: "#ffe27a", 2: "#fff8d0",
  3: "#3a2a6a", 4: "#5a48a8", 5: "#8a78d8", 6: "#c4b8f4", // awning violet
  7: "#e8505c", 8: "#fff2e0", 9: "#6b6f86", g: "#9aa0b8", j: "#c8cde0",
};

function plaza(c, seed, sway = 0, dots = true) {
  fillAll(c, "b");
  for (const y of [0, 5, 10]) c.rect(0, y, T, 1, "a");
  for (const [y, off] of [[0, 3], [5, 9], [10, 5]]) c.rect(off, y, 1, 5, "a");
  speckle(c, seed, ["c", "d", "a"], 14);
  if (dots) { // a stray coin-sized dot of a class, pressed into the stone
    const r0 = rng(seed + 3);
    const x = 2 + Math.floor(r0() * 11), y = 2 + Math.floor(r0() * 11), col = r0() < 0.5 ? "y" : "z";
    c.set(x, y, col, -1); c.set(x + 1, y, col, -1);
  }
  if (sway) { c.set(4, 12, "d", -1); c.set(11, 3, "d", -1); }
}
function crates(c, sway) { // fruit crates (the stock on sale)
  plaza(c, 11, sway, false);
  for (const [x, y, col] of [[2, 3, "z"], [9, 2, "y"], [4, 9, "y"], [10, 10, "z"]]) {
    c.rect(x, y, 5, 4, "r"); c.rect(x, y, 5, 1, "q"); c.rect(x, y + 3, 5, 1, "p");
    c.set(x + 1, y - 1, col, -1); c.set(x + 3, y - 1, col, -1); c.set(x + 2, y - 1 - sway, col, -1);
  }
}
function mosaic(c) { // floor: 2x2 confusion matrix, diagonal teal-slate, off-diagonal darker
  fillAll(c, "e");
  for (let by = 0; by < 2; by++) for (let bx = 0; bx < 2; bx++) {
    const x = bx * 8, y = by * 8, diag = bx === by;
    c.rect(x + 1, y + 1, 7, 7, diag ? "h" : "f", -1);
    c.rect(x + 1, y + 1, 7, 1, diag ? "i" : "h", -1); c.rect(x + 1, y + 1, 1, 7, diag ? "i" : "h", -1);
    c.rect(x + 3, y + 3, 3, 3, diag ? "y" : "z", -1);
    c.set(x + 3, y + 3, diag ? "o" : "u", -1);
  }
}
function canal(c, f) {
  fillAll(c, "m");
  for (const [y0, off] of [[2, 0], [7, 6], [12, 11]]) for (let x = 0; x < T; x++) {
    const p = (x + off + f * 4) % 16;
    if (p < 6) c.set(x, y0, "n", -1);
    if (p === 4) { c.set(x, y0 - 1, "o", -1); c.set(x + 1, y0, "o", -1); }
    if (p < 3) c.set(x, y0 + 1, "l", -1);
  }
  speckle(c, 3 + f, ["l"], 4);
  if (f % 2) c.set(11, 4, "1", -1); // a drifting coin glint
}
function quay(c, f) {
  canal(c, f);
  c.rect(0, 0, T, 4, "b", -1);
  speckle(c, 5, ["a", "c"], 6, [0, 0, 16, 3]);
  for (let x = 0; x < T; x++) { c.set(x, 4, (x + f) % 3 === 0 ? "o" : "n", -1); c.set(x, 3, "a", -1); }
}
function awning(c, f) { // stall awning: violet and cream stripes with a scalloped edge and a flag
  plaza(c, 21, 0, false);
  c.rect(0, 4, T, 10, "4");
  for (let x = 0; x < T; x += 4) { c.rect(x, 4, 2, 10, "8"); c.rect(x, 4, 2, 1, "x"); }
  for (let x = 0; x < T; x += 2) c.rect(x, 4, 1, 1, "5");
  for (let x = 0; x < T; x += 4) { c.ellipse(x + 2, 13, 2, 1.5, ["3", "4", "5"]); c.ellipse(x, 13, 2, 1.5, ["3", "4", "8"]); }
  c.rect(0, 14, T, 1, "3");
  c.rect(7, 0, 1, 4, "q"); // flag pole and pennant
  c.rect(8, 0 + f, 3, 2, "7");
  c.outline("k", null);
}
function stall(c) { // counter with scale pans and goods
  plaza(c, 22, 0, false);
  c.rect(0, 0, T, 2, "3"); c.rect(0, 0, T, 1, "4");
  c.rect(1, 2, 2, 12, "q"); c.rect(13, 2, 2, 12, "q");
  c.rect(1, 8, 14, 5, "r"); c.rect(1, 8, 14, 1, "w"); c.rect(1, 12, 14, 1, "p");
  for (const [x, col] of [[3, "y"], [6, "z"], [9, "y"], [12, "z"]]) { c.rect(x, 6, 2, 2, col); c.set(x, 6, "2", -1); }
  c.rect(2, 14, 12, 1, "a");
  c.outline("k", null, new Set(["y", "z"]));
}
function rail(c) { // price-tag rail
  plaza(c, 31, 0);
  c.rect(0, 6, T, 3, "r"); c.rect(0, 6, T, 1, "w"); c.rect(0, 8, T, 1, "q");
  for (let x = 2; x < T; x += 5) { c.rect(x, 9, 3, 3, "x"); c.set(x + 1, 10, "z", -1); }
  for (const x of [0, 13]) { c.rect(x, 4, 3, 10, "q"); c.rect(x, 4, 3, 1, "w"); c.rect(x + 2, 4, 1, 10, "p"); }
  c.rect(0, 14, T, 1, "a");
}
function sign(c, f) { // signboard: an ROC curve above the chance diagonal
  plaza(c, 41, 0, false);
  c.rect(7, 9, 2, 7, "q"); c.rect(7, 9, 1, 7, "r");
  c.rect(1, 1, 14, 9, "q"); c.rect(2, 2, 12, 7, "p");
  c.rect(2, 2, 12, 1, "r");
  c.line(3, 2, 3, 8, "g"); c.line(3, 8, 13, 8, "g"); // axes
  c.line(3, 8, 13, 3, "9"); // chance diagonal
  for (const [x, y] of [[4, 6], [5, 4], [7, 3], [10, 3], [13, 3]]) c.set(x, y, "y", -1); // ROC curve
  c.line(4, 6, 5, 4, "y"); c.line(5, 4, 7, 3, "y"); c.line(7, 3, 13, 2, "y");
  c.set(f ? 5 : 7, f ? 4 : 3, "1", -1); // the operating point slides along the curve
  c.rect(5, 15, 6, 1, "a");
  c.outline("k", null);
}
function lamp(c, f) {
  mosaic(c);
  c.rect(7, 5, 2, 10, "9"); c.rect(7, 5, 1, 10, "g");
  c.rect(5, 14, 6, 2, "9"); c.rect(5, 14, 6, 1, "g");
  c.rect(5, 1, 6, 5, f ? "1" : "u"); c.rect(6, 0, 4, 1, f ? "1" : "u");
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
  for (let y = 0; y < T; y += 5) c.rect(0, y + 4, T, 1, "v");
  for (let y = 0; y < 3; y++) c.rect(((y * 5) % 11) + 2, y * 5, 1, 4, "v");
  c.rect(0, 0, T, 1, "x"); c.rect(0, 15, T, 1, "q");
}
function windowTile(c, f) { // window with a tiny 2x2 matrix of light
  wall(c);
  c.rect(3, 2, 10, 11, "p"); c.rect(4, 3, 8, 9, f ? "2" : "1");
  c.rect(7, 3, 2, 9, "p"); c.rect(4, 7, 8, 2, "p");
  c.rect(4, 3, 3, 1, "2");
  c.rect(2, 13, 12, 2, "r");
}
function door(c, f) { // exchange door: a glowing balance-scale glyph
  wall(c);
  c.rect(2, 1, 12, 15, "p"); c.rect(3, 2, 10, 14, "q");
  c.rect(7, 2, 2, 14, "p");
  const g = f ? "1" : "u";
  c.rect(7, 5, 2, 7, g); c.rect(3, 6, 10, 1, g); // post and beam
  c.rect(3, 7, 3, 1, g); c.rect(10, 7, 3, 1, g);
  c.rect(3, 9, 3, 2, "y"); c.rect(10, 9, 3, 2, "z"); // pans
  c.rect(5, 1, 6, 1, "5");
}
function scale(c, f) { // pillar topped by a balance scale that tips between frames
  plaza(c, 61, 0);
  c.rect(5, 8, 6, 8, "v"); c.rect(5, 8, 2, 8, "w"); c.rect(10, 8, 1, 8, "q");
  c.rect(4, 14, 8, 2, "g"); c.rect(4, 14, 8, 1, "j");
  c.rect(7, 2, 2, 6, "1");
  const l = f ? 3 : 4, r = f ? 4 : 3; // pan heights
  c.line(3, l, 12, r, "1");
  c.line(3, l, 3, l + 2, "9"); c.line(12, r, 12, r + 2, "9");
  c.rect(1, l + 2, 5, 2, "y"); c.rect(10, r + 2, 5, 2, "z");
  c.outline("k", null, new Set(["y", "z", "1"]));
}
function bench(c) {
  plaza(c, 71, 0, false);
  c.rect(2, 7, 12, 3, "r"); c.rect(2, 7, 12, 1, "w"); c.rect(2, 9, 12, 1, "q");
  c.rect(2, 10, 2, 5, "q"); c.rect(12, 10, 2, 5, "q");
  c.rect(2, 4, 12, 2, "q"); c.rect(2, 4, 12, 1, "r");
  c.rect(2, 15, 12, 1, "a");
  c.outline("k", null);
}
function pad(c, f) { // arena pad: a threshold dial whose needle swings
  mosaic(c);
  c.rect(1, 1, 14, 14, "p"); c.rect(2, 2, 12, 12, "q");
  c.ellipse(8, 8, 5.5, 5.5, ["l", "m", f ? "n" : "m", "n"]);
  c.line(3, 8, 7, 8, "y"); c.line(9, 8, 13, 8, "z");
  const nx = f ? 11 : 5; c.line(8, 8, nx, 4, f ? "o" : "n"); // needle
  c.set(8, 8, "2", -1);
  c.outline("k", null);
}

const tiles = {
  grass: frames((c, f) => plaza(c, 1, f), 2),
  "grass-alt": frames((c, f) => plaza(c, 2, f), 2),
  flowers: frames(crates, 2),
  path: [tile(mosaic)],
  water: frames(canal, 4),
  shore: frames(quay, 4),
  "tree-top": frames(awning, 2),
  "tree-trunk": [tile(stall)],
  fence: [tile(rail)],
  sign: frames(sign, 2),
  lamp: frames(lamp, 2),
  "roof-left": [tile((c) => roof(c, "l"))],
  roof: [tile((c) => roof(c, "c"))],
  "roof-right": [tile((c) => roof(c, "r"))],
  wall: [tile(wall)],
  window: frames(windowTile, 2),
  door: frames(door, 2),
  statue: frames(scale, 2),
  bench: [tile(bench)],
  pad: frames(pad, 2),
};
const anims = { idle: tiles.grass, ...tiles };
const fps = Object.fromEntries(Object.keys(anims).map((k) => [k, k === "idle" ? 2 : anims[k].length === 4 ? 4 : 2]));
writeFileSync("game/sprites/tiles/metric-market-tiles.ts", toModule({
  id: "metric-market-tiles", name: "METRIC MARKET TILES", exportName: "METRIC_MARKET_TILES", w: T, h: T, palette: PAL, fps, anims,
  doc: "Metric Market tileset, 16×16 opaque tiles (a sandstone bazaar, striped awnings, a confusion-matrix mosaic floor, ROC signboards, balance-scale pillars and a threshold-dial arena pad). `idle` is an alias of `grass`.",
  generator: "scripts/art/metric-market.mjs",
}));
console.log("wrote metric-market tiles");
