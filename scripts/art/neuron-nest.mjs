// Generates game/sprites/tiles/neuron-nest-tiles.ts
// Neuron Nest: a twilight woodland nest of woven twigs and glowing nodes. Canopies are
// layered 3-4-2 networks with pulses travelling along their edges, signboards show the XOR
// problem, statues are perceptrons and the arena pad is the XOR decision boundary. Original.
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
  k: "#0e1424",
  a: "#1c3a3a", b: "#2a5848", c: "#3c7858", d: "#5a9c6c", // mossy floor
  e: "#2a2448", f: "#3e3a68", h: "#5a5a94", i: "#8a8cc4", // woven twig path (indigo)
  l: "#10285a", m: "#1c4a8a", n: "#3c88c8", o: "#9ae0f4", // signal stream
  p: "#2a1a1c", q: "#4e3226", r: "#7e5a40", B: "#a8805a", // bark
  s: "#2a5a3a", t: "#3c8a50", u: "#68c070", // leaf
  v: "#6a5a48", w: "#8e7a5c", x: "#c4ae84", // thatch
  y: "#ffd860", z: "#ff6aa8", // active node gold / inhibited node pink
  1: "#fff0a0", 2: "#ffffe0",
  3: "#1a1a3c", 4: "#34346a", 5: "#6a6ac0", 6: "#b4b4f4",
  7: "#58e0c8", 8: "#e8f4ee", 9: "#5a6480", g: "#8a94b0", j: "#c4cce0",
};

function moss(c, seed, sway = 0, buds = true) {
  fillAll(c, "b");
  speckle(c, seed, ["a", "c", "a"], 16);
  speckle(c, seed + 1, ["d"], 3);
  if (buds) { // a tiny dormant node bud with one dendrite
    const r0 = rng(seed + 3);
    const x = 3 + Math.floor(r0() * 9), y = 3 + Math.floor(r0() * 9);
    c.set(x, y, "i", -1); c.set(x + 1, y + 1, "h", -1); c.set(x - 1, y + 1, "h", -1);
  }
  if (sway) { c.set(4, 12, "d", -1); c.set(11, 3, "d", -1); }
}
function nodes(c, sway) { // glowing node buds on stalks (pulsing)
  moss(c, 11, sway, false);
  for (const [x, y, col] of [[3, 4, "y"], [10, 3, "z"], [5, 10, "z"], [11, 11, "y"]]) {
    c.line(x, y + 1, x, y + 4, "t", -1); c.set(x - 1, y + 3, "u", -1);
    c.rect(x - 1, y - 1, 3, 3, col, -1);
    c.set(x - 1, y - 1, "2", -1);
    if (sway) { c.set(x, y - 2, "1", -1); }
  }
}
function weave(c) { // path: woven twigs
  fillAll(c, "f");
  for (let y = 0; y < T; y += 4) c.rect(0, y, T, 1, "e");
  for (let y = 0; y < T; y += 4) for (let x = (y / 4) % 2 ? 2 : 6; x < T; x += 8) c.rect(x, y + 1, 1, 3, "e");
  for (let y = 1; y < T; y += 4) c.rect(0, y, T, 1, "h");
  c.set(4, 6, "i", -1); c.set(12, 10, "i", -1); c.set(9, 2, "i", -1);
}
function stream(c, f) {
  fillAll(c, "m");
  for (const [y0, off] of [[2, 0], [7, 6], [12, 11]]) for (let x = 0; x < T; x++) {
    const p = (x + off + f * 4) % 16;
    if (p < 6) c.set(x, y0, "n", -1);
    if (p === 4) { c.set(x, y0 - 1, "o", -1); c.set(x + 1, y0, "o", -1); }
    if (p < 3) c.set(x, y0 + 1, "l", -1);
  }
  speckle(c, 3 + f, ["l"], 4);
  c.set((f * 4 + 2) % 16, 5, "7", -1); // a signal pulse riding the current
}
function bank(c, f) {
  stream(c, f);
  c.rect(0, 0, T, 4, "b", -1);
  speckle(c, 5, ["a", "c"], 6, [0, 0, 16, 3]);
  for (let x = 0; x < T; x++) { c.set(x, 4, (x + f) % 3 === 0 ? "o" : "n", -1); c.set(x, 3, "a", -1); }
}
function canopy(c, f) { // tree top: a layered 3-4-2 network drawn as leaves, a pulse crossing the edges
  moss(c, 21, 0, false);
  c.ellipse(8, 8, 8, 7, ["s", "t", "u", "u"]);
  const L1 = [[3, 3], [3, 8], [3, 13]], L2 = [[8, 2], [8, 6], [8, 10], [8, 14]], L3 = [[13, 5], [13, 11]];
  for (const a of L1) for (const b of L2) c.line(a[0], a[1], b[0], b[1], "s", -1);
  for (const a of L2) for (const b of L3) c.line(a[0], a[1], b[0], b[1], "s", -1);
  const hot = f ? [L1[1], L2[2], L3[1]] : [L1[0], L2[1], L3[0]];
  c.line(hot[0][0], hot[0][1], hot[1][0], hot[1][1], "1", -1); c.line(hot[1][0], hot[1][1], hot[2][0], hot[2][1], "1", -1);
  for (const l of [L1, L2, L3]) for (const [x, y] of l) { c.set(x, y, "y", -1); c.set(x + 1, y, "y", -1); }
  for (const [x, y] of hot) c.set(x, y, "2", -1);
  c.outline("k", null);
}
function trunk(c) { // twisted bundle of cables
  moss(c, 22, 0, false);
  c.rect(4, 0, 8, 14, "q");
  for (const x of [5, 8, 10]) c.line(x, 0, x + 1, 13, "r", -1);
  for (const y of [3, 7, 11]) { c.set(5, y, "B", -1); c.set(9, y + 1, "B", -1); c.set(7, y, "p", -1); }
  c.rect(3, 13, 10, 2, "q"); c.rect(3, 13, 10, 1, "r");
  c.set(7, 6, "y", -1); c.set(8, 6, "y", -1); // a node glowing in the bark
  c.outline("k", null, new Set(["y"]));
}
function rail(c) { // twig rail
  moss(c, 31, 0);
  c.rect(0, 6, T, 2, "r"); c.rect(0, 6, T, 1, "B"); c.rect(0, 8, T, 1, "q");
  for (let x = 2; x < T; x += 5) { c.line(x, 8, x + 1, 12, "q", -1); c.set(x, 9, "u", -1); }
  for (const x of [0, 13]) { c.rect(x, 4, 3, 10, "q"); c.rect(x, 4, 3, 1, "B"); c.rect(x + 2, 4, 1, 10, "p"); }
  c.rect(0, 14, T, 1, "a");
}
function sign(c, f) { // signboard: the XOR problem (two gold and two pink points in a square)
  moss(c, 41, 0, false);
  c.rect(7, 9, 2, 7, "q"); c.rect(7, 9, 1, 7, "r");
  c.rect(1, 1, 14, 9, "q"); c.rect(2, 2, 12, 7, "3");
  c.rect(2, 2, 12, 1, "r");
  c.line(8, 3, 8, 8, "4", -1); c.line(3, 5, 13, 5, "4", -1);
  for (const [x, y, col] of [[4, 3, "y"], [11, 3, "z"], [4, 7, "z"], [11, 7, "y"]]) { c.rect(x, y, 2, 2, col, -1); c.set(x, y, "2", -1); }
  if (f) { c.set(8, 5, "1", -1); }
  c.rect(5, 15, 6, 1, "a");
  c.outline("k", null);
}
function lamp(c, f) {
  weave(c);
  c.rect(7, 5, 2, 10, "q"); c.rect(7, 5, 1, 10, "r");
  c.rect(5, 14, 6, 2, "q"); c.rect(5, 14, 6, 1, "r");
  c.ellipse(8, 3, 3.5, 3.5, f ? ["z", "y", "1", "2"] : ["z", "y", "y", "1"]);
  if (f) { c.set(3, 3, "1", -1); c.set(12, 3, "1", -1); c.set(8, 0, "2", -1); }
  c.outline("k", null);
}
function thatch(c, part) {
  fillAll(c, "w");
  for (let y = 0; y < T; y += 4) {
    c.rect(0, y + 3, T, 1, "v"); c.rect(0, y, T, 1, "x");
    for (let x = (y / 4) % 2 ? 4 : 0; x < T; x += 8) c.rect(x, y + 1, 1, 3, "v");
  }
  if (part === "l") { c.rect(0, 0, 1, T, "k"); c.rect(1, 0, 1, T, "v"); }
  if (part === "r") { c.rect(15, 0, 1, T, "k"); c.rect(14, 0, 1, T, "v"); }
}
function wall(c) { // woven twig wall
  fillAll(c, "r");
  for (let y = 0; y < T; y += 4) c.rect(0, y + 3, T, 1, "q");
  for (let y = 0; y < 4; y++) for (let x = y % 2 ? 2 : 6; x < T; x += 8) c.rect(x, y * 4, 1, 3, "q");
  c.rect(0, 0, T, 1, "B"); c.rect(0, 15, T, 1, "p");
}
function windowTile(c, f) { // round window with a node glowing inside
  wall(c);
  c.ellipse(8, 8, 5, 5, ["p", "q", "q", "q"]);
  c.disc(8, 8, 3.5, 3.5, f ? "2" : "1");
  c.rect(7, 4, 2, 9, "p"); c.rect(4, 7, 8, 2, "p");
  c.set(6, 5, "2", -1);
}
function door(c, f) { // door with a glowing three-input neuron glyph
  wall(c);
  c.rect(2, 1, 12, 15, "p"); c.rect(3, 2, 10, 14, "3");
  const g = f ? "1" : "y";
  c.line(4, 5, 8, 8, g, -1); c.line(4, 8, 8, 8, g, -1); c.line(4, 11, 8, 8, g, -1);
  c.line(8, 8, 12, 8, g, -1);
  for (const y of [5, 8, 11]) c.rect(3, y - 1, 2, 2, "7", -1);
  c.rect(7, 7, 3, 3, "z", -1); c.set(7, 7, "2", -1);
  c.rect(5, 1, 6, 1, "5");
}
function perceptron(c, f) { // statue: a perceptron on a plinth, inputs feeding one output
  moss(c, 61, 0);
  c.rect(4, 11, 8, 5, "9"); c.rect(4, 11, 8, 1, "j"); c.rect(4, 15, 8, 1, "3");
  const ys = [3, 6, 9];
  for (const y of ys) c.line(3, y, 8, 6, f ? "1" : "g", -1);
  c.line(8, 6, 13, 6, f ? "1" : "g", -1);
  for (const y of ys) { c.rect(2, y - 1, 3, 3, "5", -1); c.set(2, y - 1, "6", -1); }
  c.ellipse(8, 6, 3, 3, f ? ["z", "y", "1", "2"] : ["z", "z", "y", "1"]);
  c.rect(12, 5, 3, 3, f ? "7" : "5", -1);
  c.outline("k", null, new Set(["1", "2", "7"]));
}
function bench(c) {
  moss(c, 71, 0, false);
  c.rect(2, 7, 12, 3, "r"); c.rect(2, 7, 12, 1, "B"); c.rect(2, 9, 12, 1, "q");
  c.rect(2, 10, 2, 5, "q"); c.rect(12, 10, 2, 5, "q");
  c.rect(2, 4, 12, 2, "q"); c.rect(2, 4, 12, 1, "r");
  c.rect(2, 15, 12, 1, "a");
  c.outline("k", null);
}
function pad(c, f) { // arena pad: XOR boundary, two crossing lines split gold and pink quadrants
  weave(c);
  c.rect(1, 1, 14, 14, "3"); c.rect(2, 2, 12, 12, "4");
  c.rect(2, 2, 6, 6, "q"); c.rect(8, 8, 6, 6, "q");
  c.rect(8, 2, 6, 6, "4"); c.rect(2, 8, 6, 6, "4");
  for (const [x, y, col] of [[4, 4, "y"], [10, 4, "z"], [4, 10, "z"], [10, 10, "y"]]) c.rect(x, y, 2, 2, col, -1);
  c.line(2, 8, 13, 8, f ? "o" : "n", -1); c.line(8, 2, 8, 13, f ? "n" : "o", -1);
  c.set(8, 8, "2", -1);
  c.outline("k", null);
}

const tiles = {
  grass: frames((c, f) => moss(c, 1, f), 2),
  "grass-alt": frames((c, f) => moss(c, 2, f), 2),
  flowers: frames(nodes, 2),
  path: [tile(weave)],
  water: frames(stream, 4),
  shore: frames(bank, 4),
  "tree-top": frames(canopy, 2),
  "tree-trunk": [tile(trunk)],
  fence: [tile(rail)],
  sign: frames(sign, 2),
  lamp: frames(lamp, 2),
  "roof-left": [tile((c) => thatch(c, "l"))],
  roof: [tile((c) => thatch(c, "c"))],
  "roof-right": [tile((c) => thatch(c, "r"))],
  wall: [tile(wall)],
  window: frames(windowTile, 2),
  door: frames(door, 2),
  statue: frames(perceptron, 2),
  bench: [tile(bench)],
  pad: frames(pad, 2),
};
const anims = { idle: tiles.grass, ...tiles };
const fps = Object.fromEntries(Object.keys(anims).map((k) => [k, k === "idle" ? 2 : anims[k].length === 4 ? 4 : 2]));
writeFileSync("game/sprites/tiles/neuron-nest-tiles.ts", toModule({
  id: "neuron-nest-tiles", name: "NEURON NEST TILES", exportName: "NEURON_NEST_TILES", w: T, h: T, palette: PAL, fps, anims,
  doc: "Neuron Nest tileset, 16×16 opaque tiles (a twilight woodland nest: mossy floor, woven twig paths, signal streams, layered-network canopies, XOR signboards, perceptron statues and an XOR-boundary arena pad). `idle` is an alias of `grass`.",
  generator: "scripts/art/neuron-nest.mjs",
}));
console.log("wrote neuron nest tiles");
