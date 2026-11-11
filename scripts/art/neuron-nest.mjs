// Generates game/sprites/tiles/neuron-nest-tiles.ts
// Neuron Nest: a twilight thicket where the undergrowth is wired like a network. Moss floor is
// threaded with faint synapse lines, pillars hold layered neuron nodes, signs plot an XOR
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
  k: "#0e1620",
  a: "#16342e", b: "#20483c", c: "#2e6250", d: "#4a8a6a", // moss
  e: "#1c2a44", f: "#2a3e62", h: "#40588a", i: "#6a84b4", // slate-blue stone
  l: "#10304c", m: "#1a5a7a", n: "#38b4c8", o: "#b8f4f0", // signal stream
  p: "#1e1620", q: "#3a2a34", r: "#5e4650", // dark bark
  s: "#3a2a68", t: "#5a44a0", u: "#8a74d0", // violet canopy
  v: "#a8b8c8", w: "#d0dce6", x: "#f2f8fc", // pale lichen stone
  y: "#ffd24a", z: "#ff6a8a", // excitation (gold) and inhibition (rose)
  1: "#ffe88a", 2: "#fffbe0",
  3: "#243a30", 4: "#386850", 5: "#58a078", 6: "#8ad0a0", // fern
  7: "#e85a7a", 8: "#c8e8f0", 9: "#586880", g: "#8498b0", j: "#c4d2e0",
};

function moss(c, seed, sway = 0, lines = true) {
  fillAll(c, "b");
  speckle(c, seed, ["a", "c", "a"], 22);
  speckle(c, seed + 7, ["d"], 3);
  if (lines) { // a faint synapse thread running through the moss
    const r0 = rng(seed + 3);
    const y = 3 + Math.floor(r0() * 9), x = Math.floor(r0() * 8);
    c.line(x, y, x + 6, y + (r0() < 0.5 ? 2 : -2), "c");
    c.set(x, y, "d", -1);
  }
  if (sway) { c.set(4, 12, "d", -1); c.set(11, 3, "d", -1); }
}
function ferns(c, sway) { // glowing mushrooms and ferns (flower tile)
  moss(c, 11, sway, false);
  for (const [x, y, col] of [[2, 3, "y"], [10, 2, "z"], [4, 10, "z"], [11, 10, "y"]]) {
    c.rect(x + 1, y + 2, 1, 3, "3");
    c.rect(x, y, 3, 2, col); c.set(x, y, "2", -1);
    c.set(x - 1, y + 4 - sway, "5", -1); c.set(x + 3, y + 4, "5", -1);
  }
}
function slate(c) { // floor: stone slab inscribed with a 2-2-1 network
  fillAll(c, "e");
  c.rect(0, 0, T, 1, "f"); c.rect(0, 0, 1, T, "f"); c.rect(8, 0, 1, T, "f");
  for (const [x, y] of [[3, 3], [3, 11], [11, 7]]) {
    c.line(x, y, 11 - (x === 11 ? 8 : 0), 7, "f");
  }
  for (const [x, y] of [[3, 3], [3, 11]]) { c.rect(x - 1, y - 1, 3, 3, "h"); c.set(x - 1, y - 1, "i", -1); }
  c.rect(10, 6, 3, 3, "u"); c.set(10, 6, "1", -1);
  speckle(c, 17, ["f", "h"], 6);
}
function stream(c, f) { // signal stream with travelling spikes
  fillAll(c, "m");
  for (const [y0, off] of [[2, 0], [7, 6], [12, 11]]) for (let x = 0; x < T; x++) {
    const p = (x + off + f * 4) % 16;
    if (p < 6) c.set(x, y0, "n", -1);
    if (p === 4) { c.set(x, y0 - 1, "o", -1); c.set(x + 1, y0, "o", -1); }
    if (p < 3) c.set(x, y0 + 1, "l", -1);
  }
  speckle(c, 3 + f, ["l"], 4);
  if (f % 2) c.set(11, 4, "1", -1); // a firing spike
}
function bank(c, f) {
  stream(c, f);
  c.rect(0, 0, T, 4, "b", -1);
  speckle(c, 5, ["a", "c"], 6, [0, 0, 16, 3]);
  for (let x = 0; x < T; x++) { c.set(x, 4, (x + f) % 3 === 0 ? "o" : "n", -1); c.set(x, 3, "a", -1); }
}
function canopy(c, f) { // violet canopy of branching dendrites
  moss(c, 21, 0, false);
  c.ellipse(8, 7, 8, 7, ["s", "t", "u", "t"]);
  for (const [x, y] of [[4, 4], [11, 5], [7, 9], [3, 9], [12, 10]]) { c.rect(x, y, 2, 2, "u"); c.set(x, y, "6", -1); }
  c.line(3, 11, 8, 6, "s"); c.line(13, 11, 8, 6, "s"); c.line(8, 12, 8, 6, "s");
  if (f) { c.set(6, 3, "1", -1); c.set(10, 8, "1", -1); } else { c.set(5, 5, "1", -1); c.set(12, 6, "1", -1); }
  c.outline("k", null);
}
function trunk(c) {
  moss(c, 22, 0, false);
  c.rect(5, 0, 6, 14, "q"); c.rect(5, 0, 2, 14, "r"); c.rect(10, 0, 1, 14, "p");
  c.rect(3, 12, 10, 3, "q"); c.rect(3, 12, 10, 1, "r");
  c.line(8, 3, 8, 9, "y"); c.set(8, 6, "2", -1); // a glowing axon seam
  c.outline("k", null);
}
function hedge(c) { // fern hedge
  moss(c, 31, 0);
  c.rect(0, 5, T, 8, "4"); c.rect(0, 5, T, 1, "6"); c.rect(0, 12, T, 1, "3");
  for (let x = 1; x < T; x += 3) { c.set(x, 4, "5", -1); c.set(x + 1, 7, "6", -1); c.set(x, 10, "3", -1); }
  c.outline("k", null);
}
function sign(c, f) { // signboard: XOR scatter, diagonal classes
  moss(c, 41, 0, false);
  c.rect(7, 9, 2, 7, "q"); c.rect(7, 9, 1, 7, "r");
  c.rect(1, 1, 14, 9, "q"); c.rect(2, 2, 12, 7, "p");
  c.rect(2, 2, 12, 1, "r");
  c.line(8, 2, 8, 8, "9"); c.line(3, 5, 13, 5, "9"); // axes cross
  for (const [x, y, col] of [[4, 3, "y"], [12, 7, "y"], [12, 3, "z"], [4, 7, "z"]]) c.rect(x, y, 2, 2, col);
  if (f) { c.set(4, 3, "2", -1); c.set(12, 7, "2", -1); } else { c.set(12, 3, "7", -1); c.set(4, 7, "7", -1); }
  c.rect(5, 15, 6, 1, "a");
  c.outline("k", null);
}
function lamp(c, f) { // glowing orb on a stalk
  slate(c);
  c.rect(7, 6, 2, 9, "9"); c.rect(7, 6, 1, 9, "g");
  c.rect(5, 14, 6, 2, "9"); c.rect(5, 14, 6, 1, "g");
  c.ellipse(8, 4, 3.5, 3.5, [f ? "1" : "y", f ? "2" : "1", "y"]);
  c.set(7, 3, "2", -1);
  if (f) { c.set(3, 3, "1", -1); c.set(13, 3, "1", -1); }
  c.outline("k", null);
}
function roof(c, part) { // violet shingle roof
  fillAll(c, "t");
  for (let y = 0; y < T; y += 4) {
    c.rect(0, y + 3, T, 1, "s"); c.rect(0, y, T, 1, "u");
    for (let x = (y / 4) % 2 ? 4 : 0; x < T; x += 8) c.rect(x, y + 1, 1, 3, "s");
  }
  if (part === "l") { c.rect(0, 0, 1, T, "k"); c.rect(1, 0, 1, T, "s"); }
  if (part === "r") { c.rect(15, 0, 1, T, "k"); c.rect(14, 0, 1, T, "s"); }
}
function wall(c) { // pale lichen stone
  fillAll(c, "w");
  for (let y = 0; y < T; y += 5) c.rect(0, y + 4, T, 1, "v");
  for (let y = 0; y < 3; y++) c.rect(((y * 5) % 11) + 2, y * 5, 1, 4, "v");
  c.rect(0, 0, T, 1, "x"); c.rect(0, 15, T, 1, "q");
}
function windowTile(c, f) { // window showing a tiny 1-2-1 net
  wall(c);
  c.rect(3, 2, 10, 11, "p"); c.rect(4, 3, 8, 9, "e");
  c.rect(5, 7, 1, 1, f ? "1" : "y"); c.rect(10, 7, 1, 1, f ? "y" : "1");
  c.rect(7, 4, 2, 2, f ? "y" : "1"); c.rect(7, 9, 2, 2, f ? "1" : "y");
  c.line(6, 7, 7, 5, "9"); c.line(6, 7, 7, 10, "9"); c.line(9, 5, 10, 7, "9"); c.line(9, 10, 10, 7, "9");
  c.rect(2, 13, 12, 2, "r");
}
function door(c, f) { // door with a glowing perceptron glyph
  wall(c);
  c.rect(2, 1, 12, 15, "p"); c.rect(3, 2, 10, 14, "q");
  c.rect(7, 2, 2, 14, "p");
  const g = f ? "1" : "y";
  c.rect(4, 5, 2, 2, g); c.rect(4, 9, 2, 2, g); c.rect(10, 7, 2, 2, g);
  c.line(6, 6, 10, 7, g); c.line(6, 10, 10, 8, g);
  c.rect(5, 1, 6, 1, "u");
}
function node(c, f) { // pillar topped by a neuron that fires (alternating frames)
  moss(c, 61, 0);
  c.rect(5, 9, 6, 7, "v"); c.rect(5, 9, 2, 7, "w"); c.rect(10, 9, 1, 7, "g");
  c.rect(4, 14, 8, 2, "g"); c.rect(4, 14, 8, 1, "j");
  c.line(8, 9, 8, 6, "y");
  c.ellipse(8, 4, 3.5, 3.5, [f ? "1" : "u", f ? "2" : "t", "u"]);
  c.line(4, 2, 1, 1, f ? "1" : "9"); c.line(12, 2, 15, 1, f ? "1" : "9"); c.line(4, 6, 1, 7, "9"); c.line(12, 6, 15, 7, "9");
  c.outline("k", null, new Set(["y", "1", "2"]));
}
function bench(c) {
  moss(c, 71, 0, false);
  c.rect(2, 7, 12, 3, "r"); c.rect(2, 7, 12, 1, "w"); c.rect(2, 9, 12, 1, "q");
  c.rect(2, 10, 2, 5, "q"); c.rect(12, 10, 2, 5, "q");
  c.rect(2, 4, 12, 2, "q"); c.rect(2, 4, 12, 1, "r");
  c.rect(2, 15, 12, 1, "a");
  c.outline("k", null);
}
function pad(c, f) { // arena pad: a 2-3-1 network, hidden units pulse
  slate(c);
  c.rect(1, 1, 14, 14, "p"); c.rect(2, 2, 12, 12, "e");
  const inp = [[4, 5], [4, 11]], hid = [[8, 3], [8, 8], [8, 13]], out = [[12, 8]];
  for (const [ax, ay] of inp) for (const [bx, by] of hid) c.line(ax, ay, bx, by, "f");
  for (const [ax, ay] of hid) for (const [bx, by] of out) c.line(ax, ay, bx, by, "f");
  for (const [x, y] of inp) c.rect(x - 1, y - 1, 3, 3, "n");
  hid.forEach(([x, y], i) => { const on = (i + f) % 2 === 0; c.rect(x - 1, y - 1, 3, 3, on ? "1" : "u"); if (on) c.set(x, y, "2", -1); });
  c.rect(11, 7, 3, 3, f ? "z" : "y");
  c.outline("k", null);
}

const tiles = {
  grass: frames((c, f) => moss(c, 1, f), 2),
  "grass-alt": frames((c, f) => moss(c, 2, f), 2),
  flowers: frames(ferns, 2),
  path: [tile(slate)],
  water: frames(stream, 4),
  shore: frames(bank, 4),
  "tree-top": frames(canopy, 2),
  "tree-trunk": [tile(trunk)],
  fence: [tile(hedge)],
  sign: frames(sign, 2),
  lamp: frames(lamp, 2),
  "roof-left": [tile((c) => roof(c, "l"))],
  roof: [tile((c) => roof(c, "c"))],
  "roof-right": [tile((c) => roof(c, "r"))],
  wall: [tile(wall)],
  window: frames(windowTile, 2),
  door: frames(door, 2),
  statue: frames(node, 2),
  bench: [tile(bench)],
  pad: frames(pad, 2),
};
const anims = { idle: tiles.grass, ...tiles };
const fps = Object.fromEntries(Object.keys(anims).map((k) => [k, k === "idle" ? 2 : anims[k].length === 4 ? 4 : 2]));
writeFileSync("game/sprites/tiles/neuron-nest-tiles.ts", toModule({
  id: "neuron-nest-tiles", name: "NEURON NEST TILES", exportName: "NEURON_NEST_TILES", w: T, h: T, palette: PAL, fps, anims,
  doc: "Neuron Nest tileset, 16×16 opaque tiles (a twilight thicket: moss threaded with synapse lines, violet dendrite canopies, a signal stream, XOR signboards, firing-neuron pillars and a 2-3-1 network arena pad). `idle` is an alias of `grass`.",
  generator: "scripts/art/neuron-nest.mjs",
}));
console.log("wrote neuron nest tiles");
