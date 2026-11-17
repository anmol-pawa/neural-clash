// Generates game/sprites/tiles/recurrent-rapids-tiles.ts
// Recurrent Rapids: a river canyon where the water loops back on itself. Eddies curl in a circle (the
// recurrence), the boardwalk is a row of numbered time-steps, a waterwheel feeds its output back to its
// input, and the arena pad is an unrolled chain of three cells with a pulse (the hidden state) passing
// along it. Original.
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
  k: "#08121a",
  a: "#1c4a3c", b: "#2a6a4c", c: "#3c8a58", d: "#6cb868", // mossy bank turf
  e: "#4a3020", f: "#6a4630", h: "#8c6240", i: "#b88a58", // wet timber boardwalk
  l: "#0c3a64", m: "#1468a0", n: "#3ca4d8", o: "#d8f4ff", // rapids
  p: "#2c1c14", q: "#503422", r: "#7a5236", // dark timber
  s: "#a8522a", t: "#d8783a", u: "#f4a860", // copper roof tiles
  v: "#c8b890", w: "#e4d8b0", x: "#f8f0d8", // sandstone
  y: "#ffb040", z: "#ff5a9a", // hidden-state amber and magenta pulse
  1: "#ffe08a", 2: "#fffbe0",
  3: "#143428", 4: "#24604a", 5: "#3c9468", 6: "#7cd08c", // willow leaves
  7: "#e8d048", 8: "#c8e8f0", 9: "#586880", g: "#8498b0", j: "#c4d2e0",
};

function turf(c, seed, sway = 0) { // riverbank grass with the occasional pebble
  fillAll(c, "c");
  speckle(c, seed, ["b", "d", "b"], 22);
  speckle(c, seed + 7, ["a"], 4);
  if (sway) { c.set(4, 12, "d", -1); c.set(11, 3, "d", -1); c.set(5, 11, "b", -1); }
  c.set(2 + (seed % 5), 7, "g", -1);
}
function lilies(c, sway) { // yellow bank flowers on turf
  turf(c, 11, sway);
  for (const [x, y] of [[3, 3], [11, 4], [5, 10], [12, 11]]) {
    c.set(x, y, "7", -1); c.set(x + 1, y, "7", -1); c.set(x, y + 1, "7", -1); c.set(x + 1, y + 1, "7", -1);
    c.set(x + (sway ? 1 : 0), y - 1 + (sway ? 1 : 0), "2", -1);
    c.set(x, y + 2, "a", -1);
  }
}
function boards(c) { // boardwalk: planks with a pair of nail pegs, numbered notches
  fillAll(c, "f");
  for (let y = 0; y < T; y += 4) { c.rect(0, y, T, 1, "i"); c.rect(0, y + 3, T, 1, "e"); }
  for (let y = 0; y < T; y += 4) { c.set(2, y + 1, "e", -1); c.set(13, y + 1, "e", -1); }
  speckle(c, 17, ["h", "e"], 8);
  c.rect(7, 5, 2, 2, "q"); c.rect(7, 9, 2, 2, "h"); // a notch per time-step
}
function rapids(c, f) { // fast water: streaks drift right, plus a curling eddy
  fillAll(c, "m");
  for (const [y0, off] of [[2, 0], [7, 6], [12, 11]]) for (let x = 0; x < T; x++) {
    const p = (x + off + f * 4) % 16;
    if (p < 7) c.set(x, y0, "n", -1);
    if (p === 5) { c.set(x, y0 - 1, "o", -1); c.set(x + 1, y0, "o", -1); }
    if (p < 3) c.set(x, y0 + 1, "l", -1);
  }
  speckle(c, 3 + f, ["l"], 4);
  if (f % 2) c.set(11, 4, "o", -1);
}
function bank(c, f) {
  rapids(c, f);
  c.rect(0, 0, T, 4, "c", -1);
  speckle(c, 5, ["b", "d"], 6, [0, 0, 16, 3]);
  for (let x = 0; x < T; x++) { c.set(x, 4, (x + f) % 3 === 0 ? "o" : "n", -1); c.set(x, 3, "a", -1); }
}
function willow(c, f) { // weeping willow canopy: drooping strands that sway
  turf(c, 21, 0);
  c.rect(1, 2, 14, 5, "5"); c.rect(3, 0, 10, 3, "5"); c.rect(1, 2, 2, 3, "4"); c.rect(13, 3, 2, 3, "4");
  c.rect(4, 1, 5, 1, "6"); c.rect(3, 3, 3, 1, "6"); c.rect(9, 3, 4, 1, "6");
  for (let x = 1; x < 15; x += 2) {
    const len = 4 + ((x * 5) % 5);
    const sway = (x + f) % 4 < 2 ? 0 : 1;
    c.rect(x + sway, 7, 1, len, (x % 4) ? "5" : "4");
    c.set(x + sway, 7 + len, "6", -1);
  }
  c.set(7, 2, "2", -1); c.set(10, 5, "6", -1);
  c.outline("k", null);
}
function trunk(c) { // willow trunk with bark rings
  turf(c, 22, 0);
  c.rect(5, 0, 6, 13, "f"); c.rect(5, 0, 2, 13, "h"); c.rect(10, 0, 1, 13, "e");
  c.rect(3, 11, 10, 3, "f"); c.rect(3, 11, 10, 1, "h"); c.rect(3, 13, 10, 1, "e");
  c.rect(7, 3, 2, 1, "q"); c.rect(7, 7, 2, 1, "q");
  c.outline("k", null);
}
function rope(c) { // rope-and-post fence, the rope forming loops
  turf(c, 31, 0);
  for (const x of [1, 6, 11]) { c.rect(x, 4, 3, 10, "f"); c.rect(x, 4, 1, 10, "h"); c.rect(x, 3, 3, 1, "i"); }
  for (let x = 3; x < 12; x++) { const y = 6 + ((x % 5) === 2 ? 1 : 0); c.set(x, y, "v", -1); c.set(x, y + 1, "w", -1); }
  c.rect(14, 5, 2, 8, "f"); c.rect(14, 5, 1, 8, "h");
  c.outline("k", null);
}
function sign(c, f) { // a board with a loop arrow whose head blinks
  turf(c, 41, 0);
  c.rect(7, 11, 2, 5, "q"); c.rect(7, 11, 1, 5, "r");
  c.rect(1, 1, 14, 11, "q"); c.rect(2, 2, 12, 9, "p"); c.rect(2, 2, 12, 1, "r");
  const ring = [[6, 4], [7, 4], [8, 4], [9, 4], [10, 5], [10, 6], [10, 7], [9, 8], [8, 8], [7, 8], [6, 7], [5, 6], [5, 5]];
  for (const [x, y] of ring) c.set(x, y, "n", -1);
  c.set(5, 4, f ? "1" : "y", -1); c.set(4, 5, f ? "1" : "y", -1); c.set(6, 5, f ? "1" : "y", -1); // arrow head
  c.rect(5, 15, 6, 1, "a");
  c.outline("k", null);
}
function lamp(c, f) { // lantern on a post with a flickering amber flame
  boards(c);
  c.rect(7, 6, 2, 10, "q"); c.rect(7, 6, 1, 10, "r");
  c.rect(5, 14, 6, 2, "q"); c.rect(5, 14, 6, 1, "r");
  c.rect(5, 1, 6, 6, "p"); c.rect(6, 2, 4, 4, f ? "1" : "y");
  c.rect(7, 3, 2, 2, "2"); c.rect(5, 0, 6, 1, "r");
  if (f) { c.set(3, 3, "y", -1); c.set(12, 3, "y", -1); }
  c.outline("k", null);
}
function roof(c, part) { // overlapping copper shingles
  fillAll(c, "t");
  for (let y = 0; y < T; y += 4) {
    c.rect(0, y + 3, T, 1, "s"); c.rect(0, y, T, 1, "u");
    for (let x = (y / 4) % 2 ? 4 : 0; x < T; x += 8) c.rect(x, y + 1, 1, 3, "s");
  }
  if (part === "l") { c.rect(0, 0, 1, T, "k"); c.rect(1, 0, 1, T, "s"); }
  if (part === "r") { c.rect(15, 0, 1, T, "k"); c.rect(14, 0, 1, T, "s"); }
}
function wall(c) { // sandstone blocks
  fillAll(c, "w");
  for (let y = 0; y < T; y += 5) c.rect(0, y + 4, T, 1, "v");
  for (let y = 0; y < 3; y++) c.rect(((y * 5) % 11) + 2, y * 5, 1, 4, "v");
  c.rect(0, 0, T, 1, "x"); c.rect(0, 15, T, 1, "q");
}
function windowTile(c, f) { // window with a little loop glyph whose lit dot travels round it
  wall(c);
  c.rect(3, 2, 10, 11, "p"); c.rect(4, 3, 8, 9, "l");
  const ring = [[6, 5], [7, 5], [8, 5], [9, 6], [9, 7], [9, 8], [8, 9], [7, 9], [6, 8], [6, 7], [6, 6]];
  for (const [x, y] of ring) c.set(x, y, "n", -1);
  const [lx, ly] = ring[(f ? 5 : 0) % ring.length]; c.set(lx, ly, "y", -1);
  c.rect(2, 13, 12, 2, "r");
}
function door(c, f) { // timber door with a copper loop knocker
  wall(c);
  c.rect(2, 1, 12, 15, "p"); c.rect(3, 2, 10, 14, "q");
  c.rect(7, 2, 2, 14, "p");
  const g = f ? "1" : "y";
  for (const [x, y] of [[4, 6], [5, 5], [6, 5], [4, 7], [6, 8], [5, 8], [3, 7]]) c.set(x + 5, y + 2, g, -1);
  c.rect(5, 1, 6, 1, "t");
}
function wheel(c, f) { // waterwheel: its spokes rotate; a stub of water feeds back round to the top
  turf(c, 61, 0);
  c.rect(2, 13, 12, 3, "f"); c.rect(2, 13, 12, 1, "h");
  c.disc(8, 8, 5, 5, "r"); c.disc(8, 8, 4, 4, "f"); c.disc(8, 8, 1, 1, "y");
  const spokes = f ? [[0, 1], [1, 0], [0, -1], [-1, 0]] : [[1, 1], [1, -1], [-1, -1], [-1, 1]];
  for (const [dx, dy] of spokes) for (let r = 1; r < 5; r++) c.set(8 + dx * r, 8 + dy * r, "h", -1);
  for (const [dx, dy] of spokes) c.set(8 + dx * 5, 8 + dy * 5, "i", -1);
  c.set(8, 8, f ? "1" : "y", -1);
  c.outline("k", null, new Set(["y", "1"]));
}
function bench(c) { // driftwood bench
  turf(c, 71, 0);
  c.rect(2, 7, 12, 3, "h"); c.rect(2, 7, 12, 1, "i"); c.rect(2, 9, 12, 1, "e");
  c.rect(2, 10, 2, 5, "f"); c.rect(12, 10, 2, 5, "f");
  c.rect(2, 4, 12, 2, "f"); c.rect(2, 4, 12, 1, "h");
  c.rect(2, 15, 12, 1, "a");
  c.outline("k", null);
}
function pad(c, f) { // arena pad: unrolled chain of 3 cells linked by arrows; a pulse passes along it
  boards(c);
  c.rect(1, 1, 14, 14, "p"); c.rect(2, 2, 12, 12, "l");
  const cells = [[3, 6], [7, 6], [11, 6]];
  const lit = f ? 1 : 0;
  cells.forEach(([x, y], i) => {
    c.rect(x - 1, y - 1, 4, 4, i === lit ? "y" : "g");
    c.rect(x, y, 2, 2, i === lit ? "2" : "m");
  });
  // arrows between cells and a skip-loop above the chain
  for (const x of [5, 9]) { c.set(x, 7, f ? "z" : "n", -1); c.set(x + 1, 7, "n", -1); }
  for (let x = 4; x <= 12; x++) c.set(x, 4, "n", -1);
  c.set(4, 5, "n", -1); c.set(12, 5, "n", -1);
  c.set(12, 4, f ? "z" : "n", -1);
  c.rect(3, 11, 10, 1, "n");
  c.outline("k", null);
}

const tiles = {
  grass: frames((c, f) => turf(c, 1, f), 2),
  "grass-alt": frames((c, f) => turf(c, 2, f), 2),
  flowers: frames(lilies, 2),
  path: [tile(boards)],
  water: frames(rapids, 4),
  shore: frames(bank, 4),
  "tree-top": frames(willow, 2),
  "tree-trunk": [tile(trunk)],
  fence: [tile(rope)],
  sign: frames(sign, 2),
  lamp: frames(lamp, 2),
  "roof-left": [tile((c) => roof(c, "l"))],
  roof: [tile((c) => roof(c, "c"))],
  "roof-right": [tile((c) => roof(c, "r"))],
  wall: [tile(wall)],
  window: frames(windowTile, 2),
  door: frames(door, 2),
  statue: frames(wheel, 2),
  bench: [tile(bench)],
  pad: frames(pad, 2),
};
const anims = { idle: tiles.grass, ...tiles };
const fps = Object.fromEntries(Object.keys(anims).map((k) => [k, k === "idle" ? 2 : anims[k].length === 4 ? 4 : 2]));
writeFileSync("game/sprites/tiles/recurrent-rapids-tiles.ts", toModule({
  id: "recurrent-rapids-tiles", name: "RECURRENT RAPIDS TILES", exportName: "RECURRENT_RAPIDS_TILES", w: T, h: T, palette: PAL, fps, anims,
  doc: "Recurrent Rapids tileset, 16×16 opaque tiles (a river canyon: mossy banks, fast water, willow trees, a numbered boardwalk, a waterwheel and a three-cell unrolled-chain arena pad with a pulse passing along it). `idle` is an alias of `grass`.",
  generator: "scripts/art/recurrent-rapids.mjs",
}));
console.log("wrote recurrent rapids tiles");
