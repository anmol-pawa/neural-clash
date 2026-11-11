// Generates game/sprites/tiles/neuron-nest-tiles.ts
// Neuron Nest: a night garden of glowing neurons. Floor is a dark synapse lattice, trees are
// dendrite canopies, water is a pulsing signal stream, the arena pad is a XOR 4-point board. Original.
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
  k: "#0c0a1c",
  a: "#1c1a3a", b: "#272450", c: "#34306a", d: "#463f86", // night floor
  e: "#0e3a4a", f: "#16647a", h: "#2aa0b8", i: "#7ae0ee", // signal stream
  l: "#1a5a3a", m: "#2a8a52", n: "#4ac078", o: "#9af0a8", // dendrite leaf
  p: "#2a1830", q: "#4a2a50", r: "#6e4272", // soma bark
  s: "#3a2060", t: "#5c36a0", u: "#8a5ed8", // roof violet
  v: "#5a5a8a", w: "#7c7cb0", x: "#a8a8d8", // myelin wall
  y: "#ffd24a", z: "#ff5ca0", // active (yellow) and inhibitory (pink) glow
  1: "#fff0a0", 2: "#ffffe0", 3: "#5ae0ff", 4: "#c8f8ff",
  9: "#6b6f9e", g: "#9aa0c8", j: "#c8cde8",
};
function floor(c, seed, pulse = 0, dots = true) {
  fillAll(c, "b");
  for (const x of [0, 8]) c.rect(x, 0, 1, T, "a");
  for (const y of [0, 8]) c.rect(0, y, T, 1, "a");
  speckle(c, seed, ["c", "a", "d"], 12);
  if (dots) { const r0 = rng(seed + 3); const x = 2 + Math.floor(r0() * 11), y = 2 + Math.floor(r0() * 11); c.set(x, y, pulse ? "3" : "d", -1); }
}
function crystals(c, f) { // glowing mushrooms/spores
  floor(c, 11, f, false);
  for (const [x, y, col] of [[3, 4, "z"], [10, 3, "3"], [6, 10, "y"], [12, 11, "z"]]) {
    c.rect(x, y + 2, 1, 3, "r"); c.rect(x - 1, y, 3, 2, col); c.set(x, y - 1, f ? "2" : col, -1);
  }
}
function stream(c, f) {
  fillAll(c, "f");
  for (const [y0, off] of [[2, 0], [7, 6], [12, 11]]) for (let x = 0; x < T; x++) {
    const p = (x + off + f * 4) % 16;
    if (p < 6) c.set(x, y0, "h", -1);
    if (p === 4) { c.set(x, y0 - 1, "i", -1); c.set(x + 1, y0, "i", -1); }
    if (p < 3) c.set(x, y0 + 1, "e", -1);
  }
  speckle(c, 3 + f, ["e"], 4);
  if (f % 2) c.set(11, 4, "4", -1); // a travelling spike
}
function bank(c, f) {
  stream(c, f);
  c.rect(0, 0, T, 4, "b", -1);
  speckle(c, 5, ["a", "c"], 6, [0, 0, 16, 3]);
  for (let x = 0; x < T; x++) { c.set(x, 4, (x + f) % 3 === 0 ? "i" : "h", -1); c.set(x, 3, "a", -1); }
}
function canopy(c, f) { // dendrite canopy: branching green arms with glowing tips
  floor(c, 21, 0, false);
  c.ellipse(8, 8, 7.5, 7, ["l", "m", "n"]);
  c.line(8, 14, 8, 8, "q"); c.line(8, 8, 3, 3, "n"); c.line(8, 8, 13, 3, "n"); c.line(8, 8, 8, 2, "n");
  for (const [x, y] of [[3, 3], [13, 3], [8, 2]]) c.set(x, y, (f + x) % 2 ? "o" : "y", -1);
  speckle(c, 22, ["o"], 5, [3, 3, 10, 9]);
  c.outline("k", null);
}
function soma(c) { // trunk/soma base
  floor(c, 22, 0, false);
  c.rect(5, 0, 6, 14, "q"); c.rect(5, 0, 2, 14, "r"); c.rect(10, 0, 1, 14, "p");
  c.ellipse(8, 11, 4, 3, ["p", "q", "r"]);
  c.set(8, 11, "y", -1); c.set(7, 10, "1", -1); // nucleus glint
  c.rect(3, 14, 10, 1, "a");
  c.outline("k", null);
}
function axon(c) { // fence: myelin-sheath axon rail
  floor(c, 31, 0);
  c.rect(0, 6, T, 3, "w"); c.rect(0, 6, T, 1, "x"); c.rect(0, 8, T, 1, "v");
  for (let x = 2; x < T; x += 5) { c.rect(x, 5, 3, 5, "x"); c.rect(x, 9, 3, 1, "v"); }
  c.rect(0, 14, T, 1, "a");
}
function sign(c, f) { // sign: an activation curve (sigmoid) with a travelling point
  floor(c, 41, 0, false);
  c.rect(7, 9, 2, 7, "q"); c.rect(7, 9, 1, 7, "r");
  c.rect(1, 1, 14, 9, "q"); c.rect(2, 2, 12, 7, "p");
  c.line(3, 2, 3, 8, "g"); c.line(3, 8, 13, 8, "g");
  const pts = [[4, 8], [6, 7], [7, 5], [9, 3], [11, 3], [13, 3]];
  for (const [x, y] of pts) c.set(x, y, "n", -1);
  const [px, py] = pts[f ? 4 : 2]; c.set(px, py, "1", -1);
  c.rect(5, 15, 6, 1, "a");
  c.outline("k", null);
}
function lamp(c, f) { // bioluminescent bulb
  floor(c, 51);
  c.rect(7, 5, 2, 10, "9"); c.rect(7, 5, 1, 10, "g");
  c.rect(5, 14, 6, 2, "9"); c.rect(5, 14, 6, 1, "g");
  c.rect(5, 1, 6, 5, f ? "3" : "i"); c.rect(6, 0, 4, 1, f ? "3" : "i");
  c.rect(6, 2, 2, 2, "4");
  if (f) { c.set(3, 3, "3", -1); c.set(12, 3, "3", -1); }
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
function windowTile(c, f) {
  wall(c);
  c.rect(3, 2, 10, 11, "p"); c.rect(4, 3, 8, 9, f ? "4" : "3");
  c.rect(7, 3, 2, 9, "p"); c.rect(4, 7, 8, 2, "p");
  c.rect(4, 3, 3, 1, "2");
  c.rect(2, 13, 12, 2, "r");
}
function door(c, f) { // synapse door: two terminals with a spark crossing the gap
  wall(c);
  c.rect(2, 1, 12, 15, "p"); c.rect(3, 2, 10, 14, "q");
  c.rect(7, 2, 2, 14, "p");
  c.rect(3, 7, 3, 2, "y"); c.rect(10, 7, 3, 2, "y");
  c.set(f ? 7 : 8, 8, "2", -1); c.set(f ? 8 : 7, 7, "1", -1);
  c.rect(5, 1, 6, 1, "u");
}
function neuron(c, f) { // statue: stone neuron on a plinth, nucleus pulses
  floor(c, 61);
  c.rect(4, 11, 8, 5, "v"); c.rect(4, 11, 8, 1, "x"); c.rect(11, 11, 1, 5, "p");
  c.ellipse(8, 7, 3, 3, ["v", "w", "x"]);
  c.line(8, 4, 8, 1, "w"); c.line(6, 6, 2, 3, "w"); c.line(10, 6, 14, 3, "w"); c.line(8, 10, 8, 11, "w");
  c.set(8, 7, f ? "2" : "y", -1);
  c.outline("k", null, new Set(["y", "2"]));
}
function bench(c) {
  floor(c, 71, 0, false);
  c.rect(2, 7, 12, 3, "r"); c.rect(2, 7, 12, 1, "w"); c.rect(2, 9, 12, 1, "q");
  c.rect(2, 10, 2, 5, "q"); c.rect(12, 10, 2, 5, "q");
  c.rect(2, 4, 12, 2, "q"); c.rect(2, 4, 12, 1, "r");
  c.rect(2, 15, 12, 1, "a");
  c.outline("k", null);
}
function pad(c, f) { // arena pad: XOR board, four corners; XOR corners (0,1),(1,0) glow
  floor(c, 81, 0, false);
  c.rect(1, 1, 14, 14, "p"); c.rect(2, 2, 12, 12, "q");
  c.rect(3, 3, 10, 10, "a");
  c.line(3, 3, 12, 12, "d"); c.line(12, 3, 3, 12, "d");
  const on = f ? "1" : "y";
  for (const [x, y, hot] of [[3, 3, 0], [11, 3, 1], [3, 11, 1], [11, 11, 0]]) { c.rect(x, y, 2, 2, hot ? on : "d"); }
  c.set(8, 8, f ? "4" : "3", -1);
  c.outline("k", null);
}

const tiles = {
  grass: frames((c, f) => floor(c, 1, f), 2),
  "grass-alt": frames((c, f) => floor(c, 2, f), 2),
  flowers: frames(crystals, 2),
  path: [tile((c) => { floor(c, 5, 0, false); c.rect(0, 5, T, 6, "c"); c.rect(0, 5, T, 1, "d"); c.rect(0, 10, T, 1, "a"); c.rect(3, 7, 10, 2, "3"); })],
  water: frames(stream, 4),
  shore: frames(bank, 4),
  "tree-top": frames(canopy, 2),
  "tree-trunk": [tile(soma)],
  fence: [tile(axon)],
  sign: frames(sign, 2),
  lamp: frames(lamp, 2),
  "roof-left": [tile((c) => roof(c, "l"))],
  roof: [tile((c) => roof(c, "c"))],
  "roof-right": [tile((c) => roof(c, "r"))],
  wall: [tile(wall)],
  window: frames(windowTile, 2),
  door: frames(door, 2),
  statue: frames(neuron, 2),
  bench: [tile(bench)],
  pad: frames(pad, 2),
};
const anims = { idle: tiles.grass, ...tiles };
const fps = Object.fromEntries(Object.keys(anims).map((k) => [k, k === "idle" ? 2 : anims[k].length === 4 ? 4 : 2]));
writeFileSync("game/sprites/tiles/neuron-nest-tiles.ts", toModule({
  id: "neuron-nest-tiles", name: "NEURON NEST TILES", exportName: "NEURON_NEST_TILES", w: T, h: T, palette: PAL, fps, anims,
  doc: "Neuron Nest tileset, 16×16 opaque tiles (a night garden of glowing neurons: synapse-lattice floor, dendrite canopies, a signal stream, myelin walls, an activation-curve signboard and an XOR arena pad). `idle` is an alias of `grass`.",
  generator: "scripts/art/neuron-nest.mjs",
}));
console.log("wrote neuron-nest tiles");
