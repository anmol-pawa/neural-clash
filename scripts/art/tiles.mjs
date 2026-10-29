// Generates game/sprites/tiles/{python-port,lab}-tiles.ts
// Each tileset is a SpriteDef of 16x16 opaque tiles; every tile is a named
// "animation" (1 frame = static, 2-4 frames = animated). `idle` is an alias of
// the first tile so the sprite validator and /dev/sprites treat tilesets like
// any other sprite. All designs are original.
import { writeFileSync, mkdirSync } from "node:fs";
import { Canvas, toModule } from "./raster.mjs";

const T = 16;
const rng = (seed) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const tile = (fn) => { const c = new Canvas(T, T); fn(c); return c.rows(); };
const fillAll = (c, ch) => c.rect(0, 0, T, T, ch);
const speckle = (c, seed, chars, n, region = [0, 0, T, T]) => {
  const r = rng(seed);
  for (let i = 0; i < n; i++) c.set(region[0] + Math.floor(r() * region[2]), region[1] + Math.floor(r() * region[3]), chars[Math.floor(r() * chars.length)], -1);
};

// ---------------------------------------------------------------- Python Port
const PY = {
  k: "#150f26",
  a: "#2f6b3a", b: "#43883f", c: "#5fa84a", d: "#8fcf6a", // grass
  e: "#8a7a6a", f: "#a89884", h: "#c4b49c", i: "#ddd0b8", // cobble path
  l: "#1b4f8c", m: "#2f7fc4", n: "#5fb0e8", o: "#bfe8ff", // water
  p: "#5a3a26", q: "#7d5236", r: "#a8663f", // wood
  s: "#7a2e4a", t: "#a8445f", u: "#d46680", // roof
  v: "#9a8cc0", w: "#cfc2e8", x: "#e8e0f8", // plaster walls
  y: "#ffd343", z: "#3776ab", // python yellow / blue (generic palette, no logo)
  1: "#8ad0f0", 2: "#d8f4ff", // glass
  3: "#1f4f2e", 4: "#2f7a3c", 5: "#4aa352", 6: "#7ccf6c", // foliage
  7: "#f06a8a", 8: "#fff0a0", // flowers
  9: "#6b6f86", g: "#9aa0b8", j: "#c8cde0", // stone statue
};

function grass(c, seed, sway = 0) {
  fillAll(c, "b");
  speckle(c, seed, ["a", "c", "a"], 26);
  const r = rng(seed + 7);
  for (let i = 0; i < 5; i++) { // blade tufts that lean with the breeze
    const x = 1 + Math.floor(r() * 13), y = 3 + Math.floor(r() * 11);
    c.set(x, y, "a", -1); c.set(x + (sway ? 1 : 0), y - 1, "d", -1); c.set(x, y - 1, sway ? "c" : "d", -1);
  }
}
function flowers(c, sway) {
  grass(c, 11, sway);
  for (const [x, y, col] of [[3, 4, "7"], [10, 3, "8"], [6, 10, "8"], [12, 11, "7"], [2, 13, "7"]]) {
    const dx = sway ? 1 : 0;
    c.set(x + dx, y, col, -1); c.set(x + dx - 1, y, col, -1); c.set(x + dx + 1, y, col, -1); c.set(x + dx, y - 1, col, -1); c.set(x + dx, y + 1, col, -1);
    c.set(x + dx, y, col === "7" ? "8" : "y", -1);
    c.set(x, y + 2, "a", -1);
  }
}
function path(c, seed) {
  fillAll(c, "e");
  const stones = [[0, 0, 7, 5], [8, 0, 8, 4], [0, 6, 5, 5], [6, 5, 6, 5], [13, 5, 3, 5], [0, 12, 8, 4], [9, 11, 7, 5], [5, 12, 3, 4]];
  for (const [x, y, w, h] of stones) {
    c.rect(x + 1, y + 1, w - 1, h - 1, "f", -1);
    c.rect(x + 1, y + 1, w - 2, 1, "h", -1);
    c.set(x + 1, y + 1, "i", -1);
  }
  speckle(c, seed, ["e", "h"], 8);
}
function water(c, f) {
  fillAll(c, "m");
  for (const [y0, off] of [[2, 0], [7, 5], [12, 10]]) {
    for (let x = 0; x < T; x++) {
      const p = (x + off + f * 4) % 16;
      if (p < 5) c.set(x, y0, "n", -1);
      if (p === 2) c.set(x, y0 - 1, "o", -1);
      if (p < 3) c.set(x, y0 + 1, "l", -1);
    }
  }
  speckle(c, 3 + f, ["l"], 4);
}
function shore(c, f) {
  water(c, f);
  c.rect(0, 0, T, 4, "b", -1);
  speckle(c, 5, ["a", "c"], 6, [0, 0, 16, 3]);
  for (let x = 0; x < T; x++) { c.set(x, 4, (x + f) % 3 === 0 ? "o" : "n", -1); c.set(x, 3, "a", -1); }
}
function treeTop(c, f) {
  grass(c, 21, 0);
  c.ellipse(8, 8.5, 8, 8, ["3", "4", "5", "6"], { bias: 0.05 });
  const dx = f ? 1 : 0;
  for (const [x, y] of [[5, 5], [10, 4], [7, 9], [12, 8], [4, 10]]) c.set(x + dx, y, "6", -1);
  for (const [x, y] of [[6, 12], [11, 11], [9, 13]]) c.set(x, y, "3", -1);
  c.outline("k", null);
}
function treeTrunk(c) {
  grass(c, 22, 0);
  c.ellipse(8, 0, 8, 6, ["3", "4", "5", "5"]);
  c.rect(6, 0, 4, 12, "q"); c.rect(6, 0, 1, 12, "r"); c.rect(9, 0, 1, 12, "p");
  c.rect(4, 12, 8, 2, "q"); c.rect(4, 12, 8, 1, "r"); c.rect(5, 14, 6, 1, "p");
  c.rect(5, 3, 1, 1, "p"); c.rect(10, 7, 1, 1, "p");
  c.rect(3, 14, 10, 2, "a");
  c.outline("k", null);
}
function fence(c) {
  grass(c, 31, 0);
  c.rect(0, 5, T, 2, "r"); c.rect(0, 6, T, 1, "q");
  c.rect(0, 10, T, 2, "r"); c.rect(0, 11, T, 1, "q");
  for (const x of [1, 8]) { c.rect(x, 3, 3, 11, "r"); c.rect(x + 2, 3, 1, 11, "q"); c.rect(x, 3, 3, 1, "i"); }
  c.rect(0, 14, T, 1, "a");
}
function sign(c, f) {
  grass(c, 41, 0);
  c.rect(7, 8, 2, 8, "q"); c.rect(7, 8, 1, 8, "r");
  c.rect(1, 1, 14, 8, "q"); c.rect(2, 2, 12, 6, "r");
  c.rect(2, 2, 12, 1, "i");
  // "{}" in python blue plus a blinking cursor
  const g = ["..z", ".z.", "z..", ".z.", "..z"];
  g.forEach((row, y) => [...row].forEach((ch, x) => ch === "z" && c.set(4 + x, 3 + y, "z", -1)));
  const g2 = ["z..", ".z.", "..z", ".z.", "z.."];
  g2.forEach((row, y) => [...row].forEach((ch, x) => ch === "z" && c.set(8 + x, 3 + y, "z", -1)));
  if (f) c.rect(12, 3, 1, 5, "y");
  c.rect(5, 15, 6, 1, "a");
  c.outline("k", null);
}
function lamp(c, f) {
  path(c, 51);
  c.rect(7, 5, 2, 10, "9"); c.rect(7, 5, 1, 10, "g");
  c.rect(5, 14, 6, 2, "9"); c.rect(5, 14, 6, 1, "g");
  c.rect(4, 1, 8, 5, "9");
  c.rect(5, 2, 6, 3, f ? "y" : "8");
  c.rect(6, 2, 2, 1, "2");
  if (f) { c.set(3, 3, "8", -1); c.set(12, 3, "8", -1); }
  c.outline("k", null);
}
function roof(c, part) {
  fillAll(c, "t");
  for (let y = 0; y < T; y += 4) {
    c.rect(0, y + 3, T, 1, "s");
    c.rect(0, y, T, 1, "u");
    for (let x = (y / 4) % 2 ? 4 : 0; x < T; x += 8) c.rect(x, y + 1, 1, 3, "s");
  }
  if (part === "l") { c.rect(0, 0, 1, T, "k"); c.rect(1, 0, 1, T, "s"); }
  if (part === "r") { c.rect(T - 1, 0, 1, T, "k"); c.rect(T - 2, 0, 1, T, "s"); }
  c.rect(0, 0, T, 1, "u");
}
function wall(c) {
  fillAll(c, "w");
  c.rect(0, 0, T, 2, "s");
  c.rect(0, 2, T, 1, "v");
  for (let y = 4; y < T; y += 5) { c.rect(0, y, T, 1, "x"); c.rect(0, y + 4, T, 1, "v"); }
  speckle(c, 61, ["x", "v"], 8, [0, 3, 16, 13]);
}
function wallWindow(c, f) {
  wall(c);
  c.rect(3, 4, 10, 9, "p");
  c.rect(4, 5, 8, 7, f ? "8" : "1");
  c.rect(4, 5, 8, 1, f ? "y" : "2");
  c.rect(7, 5, 2, 7, "p"); c.rect(4, 8, 8, 1, "p");
  c.rect(2, 13, 12, 2, "q");
  if (!f) { c.set(5, 6, "2", -1); c.set(10, 10, "2", -1); }
  else { c.set(5, 11, "y", -1); c.set(10, 6, "y", -1); }
}
function door(c) {
  wall(c);
  c.rect(4, 2, 8, 14, "p");
  c.rect(5, 3, 6, 13, "q");
  c.rect(5, 3, 1, 13, "r");
  c.rect(8, 3, 1, 13, "p");
  c.rect(10, 9, 1, 2, "y");
  c.rect(6, 4, 2, 3, "1"); c.rect(9, 4, 1, 3, "1");
  c.rect(3, 15, 10, 1, "e");
}
function statue(c, f) {
  path(c, 71);
  c.rect(3, 12, 10, 4, "9"); c.rect(3, 12, 10, 1, "j"); c.rect(3, 15, 10, 1, "k");
  // a coiled serpent: three stacked coils, head on top with a flicking tongue
  c.ellipse(8, 11, 5, 2.4, ["9", "g", "g", "j"]);
  c.ellipse(8, 8, 4, 2.2, ["9", "g", "j", "j"]);
  c.ellipse(8, 5, 3, 2, ["9", "g", "j", "j"]);
  c.ellipse(10, 2.6, 2.8, 2.2, ["z", "z", "9", "j"]);
  c.set(11, 2, "k", -1);
  if (f) { c.set(13, 3, "7", -1); c.set(14, 3, "7", -1); c.set(14, 2, "7", -1); }
  else { c.set(13, 3, "7", -1); c.set(14, 4, "7", -1); }
  c.set(4, 11, "y", -1);
  c.outline("k", null);
}
function bench(c) {
  grass(c, 81, 0);
  c.rect(1, 6, 14, 3, "r"); c.rect(1, 6, 14, 1, "i"); c.rect(1, 8, 14, 1, "q");
  c.rect(1, 3, 14, 2, "q"); c.rect(1, 3, 14, 1, "r");
  c.rect(2, 9, 2, 5, "p"); c.rect(12, 9, 2, 5, "p");
  c.rect(1, 14, 14, 1, "a");
  c.outline("k", null);
}

const pyFrames = (fn, n) => Array.from({ length: n }, (_, i) => tile((c) => fn(c, i)));
const pyTiles = {
  grass: [tile((c) => grass(c, 1, 0)), tile((c) => grass(c, 1, 1))],
  "grass-alt": [tile((c) => grass(c, 2, 0)), tile((c) => grass(c, 2, 1))],
  flowers: pyFrames(flowers, 2),
  path: [tile((c) => path(c, 4))],
  water: pyFrames(water, 4),
  shore: pyFrames(shore, 4),
  "tree-top": pyFrames(treeTop, 2),
  "tree-trunk": [tile(treeTrunk)],
  fence: [tile(fence)],
  sign: pyFrames(sign, 2),
  lamp: pyFrames(lamp, 2),
  "roof-left": [tile((c) => roof(c, "l"))],
  roof: [tile((c) => roof(c, "m"))],
  "roof-right": [tile((c) => roof(c, "r"))],
  wall: [tile(wall)],
  window: pyFrames(wallWindow, 2),
  door: [tile(door)],
  statue: pyFrames(statue, 2),
  bench: [tile(bench)],
};

// ------------------------------------------------------------------ Lab interior
const LAB = {
  k: "#150f26",
  a: "#46486a", b: "#5f6290", c: "#7c80b8", d: "#a4a9de", // floor ramp (cool slate)
  e: "#2c2f52", f: "#3d4170", h: "#585d9c", i: "#8d93d6", // wall ramp
  l: "#5a3a26", m: "#7d5236", n: "#a8663f", o: "#d28a5a", // wood
  p: "#10281f", q: "#1d5a40", r: "#2f8f5f", s: "#6fd49a", // plant
  t: "#0e1a2e", u: "#1f3a63", v: "#2fe0d2", w: "#aaffee", // screen / glow
  x: "#f4f1e6", y: "#d8d4c4", z: "#a8a490", // whiteboard / paper
  1: "#c9433f", 2: "#ffd343", 3: "#6df0f7", 4: "#9c5cff", // led / marker colours
  5: "#8ad0f0", 6: "#d8f4ff", 7: "#2a2e3e", 8: "#4a5068", 9: "#8a90a8", // metal
  g: "#b8607a", j: "#e8a4b8", // rug
};

function floor(c, alt) {
  fillAll(c, alt ? "c" : "b");
  c.rect(0, 0, 8, 8, alt ? "c" : "b"); c.rect(8, 8, 8, 8, alt ? "c" : "b");
  c.rect(8, 0, 8, 8, alt ? "b" : "c"); c.rect(0, 8, 8, 8, alt ? "b" : "c");
  c.rect(0, 0, T, 1, "d"); c.rect(0, 0, 1, T, "d");
  c.rect(0, 15, T, 1, "a"); c.rect(15, 0, 1, T, "a");
  c.rect(7, 0, 2, T, "a"); c.rect(0, 7, T, 2, "a");
  c.rect(7, 0, 1, T, "b"); c.rect(0, 7, T, 1, "b");
}
function wallTop(c) {
  fillAll(c, "f");
  c.rect(0, 0, T, 3, "e");
  for (let x = 0; x < T; x += 8) { c.rect(x, 3, 1, 13, "e"); c.rect(x + 1, 3, 1, 13, "h"); }
  c.rect(0, 3, T, 1, "h");
  speckle(c, 91, ["h", "e"], 8, [0, 4, 16, 12]);
}
function wallBase(c) {
  wallTop(c);
  c.rect(0, 12, T, 4, "e");
  c.rect(0, 12, T, 1, "i");
  c.rect(0, 15, T, 1, "k");
}
function windowTile(c, f) {
  wallTop(c);
  c.rect(2, 2, 12, 12, "l");
  c.rect(3, 3, 10, 10, "5");
  c.rect(3, 3, 10, 3, "6");
  c.rect(7, 3, 2, 10, "l"); c.rect(3, 8, 10, 1, "l");
  const cx = 4 + f * 2;
  c.rect(cx, 4, 3, 1, "x"); c.rect(cx + 1, 3, 2, 1, "x");
  c.rect(10 - f, 10, 2, 1, "6");
  c.rect(1, 14, 14, 2, "m");
}
function board(c, side, f) {
  wallTop(c);
  c.rect(0, 1, T, 13, "z");
  c.rect(side === "l" ? 1 : 0, 2, side === "l" ? 15 : 15, 11, "x");
  if (side === "l") { c.rect(0, 1, 1, 13, "9"); } else c.rect(15, 1, 1, 13, "9");
  c.rect(0, 14, T, 2, "8");
  c.rect(side === "l" ? 3 : 2, 14, 3, 1, "1"); c.rect(side === "l" ? 8 : 7, 14, 3, 1, "3");
  if (side === "l") {
    // y = w x + b, then a dashed loss curve
    const pts = [[3, 4], [4, 4], [6, 4], [7, 5], [9, 4], [10, 4], [12, 4], [13, 4]];
    pts.forEach(([x, y]) => c.set(x, y, "u", -1));
    c.line(3, 8, 5, 10, "1"); c.line(5, 10, 8, 11, "1"); c.line(8, 11, 13, 11, "1");
    c.line(3, 8, 3, 7, "u");
    c.set(13 - f * 2, 11, "3", -1); c.set(12 - f * 2, 10, f ? "w" : "3", -1); // the loss dot slides along the curve
  } else {
    c.rect(2, 4, 5, 1, "u"); c.rect(9, 4, 4, 1, "4"); c.rect(2, 6, 3, 1, "u");
    c.line(7, 12, 12, 7, "3");
    c.set(12, 7, "w", -1);
    if (f) c.rect(9, 9, 1, 2, "u"); // blinking text cursor
  }
}
function deskBase(c, side) {
  floor(c, false);
  c.rect(0, 4, T, 4, "n"); c.rect(0, 4, T, 1, "o"); c.rect(0, 7, T, 1, "m");
  c.rect(0, 8, T, 3, "m"); c.rect(0, 10, T, 1, "l");
  if (side !== "r") c.rect(1, 11, 2, 5, "l");
  if (side !== "l") c.rect(13, 11, 2, 5, "l");
  c.rect(0, 15, T, 1, "a");
}
function deskPapers(c) {
  deskBase(c, "l");
  c.rect(3, 2, 6, 4, "x"); c.rect(3, 2, 6, 1, "y"); c.rect(4, 3, 4, 1, "u"); c.rect(4, 5, 3, 1, "u");
  c.rect(10, 3, 3, 2, "y"); c.set(11, 4, "1", -1);
  c.rect(2, 6, 3, 1, "k"); // pencil
  c.outline("k", null, new Set(["a", "b", "c", "d"]));
}
function monitor(c, f) {
  deskBase(c, "r");
  c.rect(2, 0, 12, 7, "7"); c.rect(3, 1, 10, 5, "t");
  const lines = [[4, 3, 0], [6, 5, 1], [5, 4, 2], [7, 3, 0]];
  for (let i = 0; i < 4; i++) {
    const [w, off, col] = lines[(i + f) % lines.length];
    c.rect(4 + (off % 3), 1 + i + (i > 1 ? 0 : 0), Math.min(w, 8 - (off % 3)), 1, ["v", "4", "2"][col]);
  }
  c.set(4 + ((f * 2) % 7), 5, "w", -1); // cursor
  c.rect(7, 7, 2, 1, "8");
  c.rect(10, 8, 4, 1, "9"); c.rect(10, 8, 4, 1, "9"); // keyboard strip on the desk
  c.outline("k", null, new Set(["a", "b", "c", "d"]));
}
function server(c, f) {
  floor(c, true);
  c.rect(2, 0, 12, 16, "7"); c.rect(3, 1, 10, 14, "8");
  for (let r = 0; r < 4; r++) {
    c.rect(4, 2 + r * 3, 8, 2, "7");
    for (let k = 0; k < 3; k++) {
      const on = (r + k + f) % 3 === 0;
      c.set(5 + k * 2, 2 + r * 3, on ? ["3", "v", "2"][k] : "8", -1);
    }
    c.set(11, 3 + r * 3, (r + f) % 2 ? "1" : "8", -1);
  }
  c.rect(2, 15, 12, 1, "k");
  c.outline("k", null, new Set(["a", "b", "c", "d"]));
}
function plant(c, f) {
  floor(c, true);
  c.rect(5, 10, 6, 5, "n"); c.rect(5, 10, 6, 1, "o"); c.rect(5, 14, 6, 1, "m");
  const sw = f ? 1 : 0;
  c.ellipse(8 - sw, 5, 5, 5, ["p", "q", "r", "s"]);
  c.ellipse(4, 8, 3, 2.5, ["q", "r", "r", "s"]);
  c.ellipse(12 + sw, 8, 3, 2.5, ["q", "r", "r", "s"]);
  c.line(8, 10, 8, 7, "q");
  c.outline("k", null, new Set(["a", "b", "c", "d"]));
}
function bookshelf(c) {
  wallTop(c);
  c.rect(0, 0, T, T, "l");
  c.rect(1, 1, 14, 14, "m");
  for (const y of [1, 8]) {
    c.rect(1, y, 14, 6, "l");
    let x = 2;
    const cols = ["1", "u", "r", "2", "4", "3", "n", "g"];
    for (let i = 0; x < 14; i++) {
      const w = 2 + (i % 2), h = 4 + ((i * 3) % 2);
      c.rect(x, y + 6 - h, w, h, cols[i % cols.length]);
      c.set(x, y + 6 - h, "x", -1);
      x += w;
    }
    c.rect(1, y + 6, 14, 1, "n");
  }
}
function rig(c, f) {
  floor(c, true);
  // the Training Rig: a pedestal that holds a glowing neuron orb
  c.rect(2, 11, 12, 4, "8"); c.rect(2, 11, 12, 1, "9"); c.rect(2, 14, 12, 1, "7");
  c.rect(5, 9, 6, 3, "8"); c.rect(5, 9, 6, 1, "9");
  const glow = ["v", "3", "w", "3"][f];
  c.ellipse(8, 5, 5, 4.6, ["u", "v", glow, "w"]);
  c.set(6, 4, "w", -1);
  for (const [x, y] of [[8, 3], [6, 6], [10, 6]]) c.set(x, y, "t", -1);
  c.line(8, 3, 6, 6, "t"); c.line(8, 3, 10, 6, "t");
  c.set(1 + f * 4, 1, "w", -1); c.set(14 - f * 3, 2, "v", -1); c.set(1, 13 - f, "v", -1);
  c.outline("k", null, new Set(["a", "b", "c", "d"]));
}
function rug(c, part) {
  floor(c, false);
  const full = part === "c";
  c.rect(0, 0, T, T, "g");
  c.rect(0, 1, T, 1, "j"); c.rect(0, 14, T, 1, "j");
  if (full) { c.rect(5, 5, 6, 6, "j"); c.rect(6, 6, 4, 4, "g"); c.rect(7, 7, 2, 2, "2"); }
  if (part === "l") { c.rect(0, 0, 1, T, "j"); c.rect(1, 0, 1, T, "g"); }
  if (part === "r") { c.rect(15, 0, 1, T, "j"); c.rect(14, 0, 1, T, "g"); }
}
function doorLab(c, f) {
  wallTop(c);
  c.rect(2, 1, 12, 15, "8");
  c.rect(3, 2, 10, 14, f ? "u" : "t");
  c.rect(7, 2, 2, 14, "8");
  c.rect(5, 1, 6, 1, "3");
  c.rect(2, 15, 12, 1, "k");
  c.rect(5, 8, 1, 3, "9"); c.rect(10, 8, 1, 3, "9");
}
function coffee(c, f) {
  floor(c, false);
  c.rect(0, 4, T, 4, "n"); c.rect(0, 4, T, 1, "o"); c.rect(0, 8, T, 3, "m"); c.rect(0, 10, T, 1, "l");
  c.rect(1, 11, 2, 5, "l"); c.rect(13, 11, 2, 5, "l");
  c.rect(3, 0, 7, 5, "8"); c.rect(3, 0, 7, 1, "9"); c.rect(4, 2, 5, 2, "t");
  c.rect(5, 5, 3, 3, "x"); c.rect(5, 5, 3, 1, "y");
  c.rect(11, 3, 3, 4, "x"); c.rect(11, 3, 3, 1, "y"); c.rect(14, 4, 1, 2, "z");
  if (f) { c.set(6, 3, "6", -1); c.set(7, 2, "6", -1); c.set(12, 2, "6", -1); } else { c.set(7, 3, "6", -1); c.set(6, 2, "6", -1); c.set(13, 2, "6", -1); }
  c.rect(0, 15, T, 1, "a");
  c.outline("k", null, new Set(["a", "b", "c", "d"]));
}
const labFrames = (fn, n) => Array.from({ length: n }, (_, i) => tile((c) => fn(c, i)));
const labTiles = {
  floor: [tile((c) => floor(c, false))],
  "floor-alt": [tile((c) => floor(c, true))],
  wall: [tile(wallTop)],
  "wall-base": [tile(wallBase)],
  window: labFrames(windowTile, 2),
  "board-left": labFrames((c, f) => board(c, "l", f), 2),
  "board-right": labFrames((c, f) => board(c, "r", f), 2),
  "desk-papers": [tile(deskPapers)],
  monitor: labFrames(monitor, 4),
  server: labFrames(server, 4),
  plant: labFrames(plant, 2),
  bookshelf: [tile(bookshelf)],
  rig: labFrames(rig, 4),
  "rug-left": [tile((c) => rug(c, "l"))],
  rug: [tile((c) => rug(c, "c"))],
  "rug-right": [tile((c) => rug(c, "r"))],
  door: labFrames(doorLab, 2),
  coffee: labFrames(coffee, 2),
};

// ------------------------------------------------------------------ write
const out = "game/sprites/tiles/";
mkdirSync(out, { recursive: true });
const write = (id, name, exportName, doc, palette, tiles) => {
  const anims = { idle: tiles.grass ?? tiles.rig, ...tiles };
  const fps = Object.fromEntries(Object.keys(anims).map((k) => [k, k === "idle" ? 2 : anims[k].length === 4 ? 4 : 2]));
  writeFileSync(out + `${id}.ts`, toModule({ id, name, doc, exportName, w: T, h: T, palette, fps, anims, generator: "scripts/art/tiles.mjs" }));
};
write("python-port-tiles", "PYTHON PORT TILES", "PYTHON_PORT_TILES", "Python Port tileset, 16×16 opaque tiles (a lamp-lit harbour town with serpent statues). `idle` is an alias of `grass`.", PY, pyTiles);
write("lab-tiles", "LAB TILES", "LAB_TILES", "Okafor's Lab interior tileset, 16×16 opaque tiles (slate floor, whiteboards, servers and the Training Rig). `idle` is an alias of `rig`.", LAB, labTiles);
console.log("wrote tilesets");
