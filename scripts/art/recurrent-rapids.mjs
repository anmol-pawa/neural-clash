// Generates game/sprites/tiles/recurrent-rapids-tiles.ts
// Recurrent Rapids: a river gorge where the current loops back on itself. Mossy riverbank ground,
// rushing water with chevron foam, reed clusters, stepping-stone paths, signboards with a loop arrow,
// a pillar of chained "time step" blocks and an arena pad whose arrow carries state from cell to cell.
// Original.
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
  a: "#1a3a28", b: "#2a5a38", c: "#3c7a48", d: "#68a860", // mossy bank
  e: "#1c2c3c", f: "#2c4258", h: "#44607c", i: "#7498b8", // wet slate
  l: "#0c3a6a", m: "#1468a8", n: "#40b0e8", o: "#e0f8ff", // river
  p: "#201a14", q: "#4a3624", r: "#7a5a3c", // driftwood
  s: "#8a3a2a", t: "#c0583a", u: "#f08a5a", // terracotta roof
  v: "#b8b0a0", w: "#dcd6c8", x: "#f8f4ea", // pale sandstone
  y: "#ffb040", z: "#ff5a9a", // hidden-state amber and magenta
  1: "#ffe08a", 2: "#fffbe0",
  3: "#1a4a30", 4: "#2a8050", 5: "#58b868", 6: "#a8e890", // reeds
  7: "#e85a7a", 8: "#c8e8f0", 9: "#586878", g: "#8498a8", j: "#c4d4de",
};

function rock(c, seed, sway = 0, tufts = true) { // mossy riverbank ground with grass tufts
  fillAll(c, "b");
  speckle(c, seed, ["a", "c", "a"], 22);
  speckle(c, seed + 7, ["d"], 3);
  if (tufts) {
    const r0 = rng(seed + 3);
    const x = 2 + Math.floor(r0() * 10), y = 4 + Math.floor(r0() * 8);
    c.set(x, y, "d", -1); c.set(x + sway, y - 1, "d", -1); c.set(x + 1, y, "c", -1);
  }
}
function crystals(c, sway) { // reed clusters with amber seed heads (flower tile)
  rock(c, 11, sway, false);
  for (const [x, y, col, hi] of [[2, 4, "4", "5"], [10, 3, "5", "6"], [4, 10, "5", "6"], [11, 10, "4", "5"]]) {
    c.rect(x + 1, y + 2, 1, 5, col); c.rect(x + 3, y + 3, 1, 4, col); c.rect(x - 1 + sway, y + 3, 1, 3, col);
    c.rect(x + 1, y, 1, 2, "q"); c.set(x + 1, y - 1, "y", -1);
    c.set(x + 3, y + 1, hi, -1);
  }
}
function slab(c) { // path: flagstone drawn as a 4x4 grid of pixels, one lit cell
  fillAll(c, "e");
  c.rect(0, 0, T, 1, "f"); c.rect(0, 0, 1, T, "f"); c.rect(8, 0, 1, T, "f"); c.rect(0, 8, T, 1, "f");
  c.rect(4, 4, 1, 1, "h"); c.rect(12, 12, 1, 1, "h"); c.rect(12, 4, 1, 1, "h");
  c.rect(3, 11, 3, 3, "h"); c.set(3, 11, "i", -1);
  speckle(c, 17, ["f", "h"], 6);
}
function stream(c, f) { // rushing river with chevron foam streaks
  fillAll(c, "m");
  for (const [y0, off] of [[2, 0], [7, 6], [12, 11]]) for (let x = 0; x < T; x++) {
    const p = (x + off + f * 4) % 16;
    if (p < 7) c.set(x, y0, "n", -1);
    if (p === 5) { c.set(x, y0 - 1, "o", -1); c.set(x + 1, y0, "o", -1); c.set(x, y0 + 1, "o", -1); } // chevron foam
    if (p < 3) c.set(x, y0 + 1, "l", -1);
  }
  speckle(c, 3 + f, ["l"], 4);
  if (f % 2) c.set(11, 4, "o", -1);
}
function bank(c, f) {
  stream(c, f);
  c.rect(0, 0, T, 4, "b", -1);
  speckle(c, 5, ["a", "c"], 6, [0, 0, 16, 3]);
  for (let x = 0; x < T; x++) { c.set(x, 4, (x + f) % 3 === 0 ? "o" : "n", -1); c.set(x, 3, "a", -1); }
}
function crystalTop(c, f) { // a tall cluster of cattails and reeds
  rock(c, 21, 0, false);
  for (const [x, w, top, col] of [[2, 4, 3, "4"], [6, 5, 0, "5"], [11, 3, 4, "4"]]) {
    c.rect(x, top + 3, w, 12 - top, col);
    c.rect(x + 1, top + 1, w - 2, 2, col);
    c.rect(x, top + 3, 1, 12 - top, "3");
    c.rect(x + 1, top + 2, 1, 8, "6");
  }
  c.rect(7, 0, 2, 3, "q"); c.rect(7, 0, 1, 3, "r"); // cattail head
  c.rect(7, 12, 3, 3, "3");
  if (f) { c.set(8, 1, "y", -1); c.set(3, 6, "6", -1); } else { c.set(12, 7, "6", -1); c.set(8, 5, "5", -1); }
  c.outline("k", null);
}
function pillar(c) { // mossy driftwood trunk
  rock(c, 22, 0, false);
  c.rect(5, 0, 6, 14, "r"); c.rect(5, 0, 2, 14, "q"); c.rect(10, 0, 1, 14, "p");
  c.rect(3, 12, 10, 3, "r"); c.rect(3, 12, 10, 1, "q");
  c.rect(5, 4, 3, 1, "d"); c.rect(8, 8, 2, 1, "d"); c.rect(6, 10, 3, 1, "c"); // moss
  c.outline("k", null);
}
function stalagmites(c) { // stake fence of driftwood posts
  rock(c, 31, 0);
  c.rect(0, 8, T, 2, "r"); c.rect(0, 8, T, 1, "q"); c.rect(0, 12, T, 2, "r"); c.rect(0, 12, T, 1, "q");
  for (let x = 1; x < T; x += 5) {
    c.rect(x, 3, 3, 12, "r"); c.rect(x, 3, 1, 12, "q"); c.rect(x + 1, 2, 1, 1, "r");
    c.set(x + 1, 4, "w", -1);
  }
  c.outline("k", null);
}
function sign(c, f) { // a loop arrow: the output feeds back into the input
  rock(c, 41, 0, false);
  c.rect(7, 11, 2, 5, "q"); c.rect(7, 11, 1, 5, "r");
  c.rect(1, 1, 14, 11, "q"); c.rect(2, 2, 12, 9, "p");
  c.rect(2, 2, 12, 1, "r");
  c.rect(4, 4, 7, 1, "n"); c.rect(10, 4, 1, 5, "n"); c.rect(4, 8, 7, 1, "n"); c.rect(4, 5, 1, 3, "n"); // loop
  c.rect(11, 6, 1, 1, "n");
  const hx = f ? 8 : 5;
  c.rect(hx, 4, 2, 1, "y"); // a pulse travelling round the loop
  c.rect(4, 6, 1, 1, f ? "y" : "n");
  c.rect(5, 15, 6, 1, "a");
  c.outline("k", null);
}
function lamp(c, f) { // brazier lantern on a driftwood post
  slab(c);
  c.rect(7, 7, 2, 8, "r"); c.rect(7, 7, 1, 8, "q");
  c.rect(5, 14, 6, 2, "q"); c.rect(5, 14, 6, 1, "r");
  c.rect(5, 2, 6, 6, "p"); c.rect(6, 3, 4, 4, f ? "1" : "y"); c.rect(6, 3, 1, 3, "2");
  c.rect(4, 1, 8, 1, "r"); c.rect(6, 0, 4, 1, "r");
  if (f) { c.set(3, 4, "y", -1); c.set(12, 5, "y", -1); }
  c.outline("k", null);
}
function roof(c, part) { // terracotta tiles
  fillAll(c, "s");
  for (let y = 0; y < T; y += 4) {
    c.rect(0, y + 3, T, 1, "p"); c.rect(0, y, T, 1, "t");
    for (let x = (y / 4) % 2 ? 4 : 0; x < T; x += 8) c.rect(x, y + 1, 1, 3, "p");
  }
  if (part === "p") { c.rect(0, 0, 1, T, "k"); c.rect(1, 0, 1, T, "p"); }
  if (part === "r") { c.rect(15, 0, 1, T, "k"); c.rect(14, 0, 1, T, "p"); }
}
function wall(c) { // pale limestone blocks
  fillAll(c, "w");
  for (let y = 0; y < T; y += 5) c.rect(0, y + 4, T, 1, "v");
  for (let y = 0; y < 3; y++) c.rect(((y * 5) % 11) + 2, y * 5, 1, 4, "v");
  c.rect(0, 0, T, 1, "x"); c.rect(0, 15, T, 1, "q");
}
function windowTile(c, f) { // window showing a tiny chain of three cells passing a state along
  wall(c);
  c.rect(3, 2, 10, 11, "p"); c.rect(4, 3, 8, 9, "e");
  for (let i = 0; i < 3; i++) {
    c.rect(5, 4 + i * 3, 6, 2, i === (f ? 2 : 0) ? "y" : "h");
  }
  c.rect(2, 13, 12, 2, "r");
}
function door(c, f) { // arched door with a glowing loop glyph
  wall(c);
  c.rect(2, 1, 12, 15, "p"); c.rect(3, 2, 10, 14, "q");
  c.rect(7, 2, 2, 14, "p");
  const g = f ? "1" : "y";
  c.rect(4, 5, 8, 1, g); c.rect(4, 10, 8, 1, g); c.rect(4, 5, 1, 6, g); c.rect(11, 5, 1, 6, g);
  c.set(7, 4, g, -1); c.set(8, 11, g, -1);
  c.rect(5, 1, 6, 1, "n");
}
function scanner(c, f) { // pillar of chained time-step blocks, a pulse travelling down the chain
  rock(c, 61, 0);
  c.rect(5, 2, 6, 14, "v"); c.rect(5, 2, 2, 14, "w"); c.rect(10, 2, 1, 14, "g");
  c.rect(4, 14, 8, 2, "g"); c.rect(4, 14, 8, 1, "j");
  for (let y = 5; y < 13; y += 3) c.rect(5, y, 6, 1, "v");
  const wy = f ? 8 : 3;
  c.rect(4, wy, 8, 4, "y"); c.rect(5, wy + 1, 6, 2, f ? "1" : "p");
  c.rect(7, wy + 4, 2, 1, "y");
  c.outline("k", null, new Set(["y", "1"]));
}
function bench(c) { // driftwood bench
  rock(c, 71, 0, false);
  c.rect(2, 7, 12, 3, "r"); c.rect(2, 7, 12, 1, "x"); c.rect(2, 9, 12, 1, "q");
  c.rect(2, 10, 2, 5, "q"); c.rect(12, 10, 2, 5, "q");
  c.rect(2, 4, 12, 2, "q"); c.rect(2, 4, 12, 1, "r");
  c.rect(2, 15, 12, 1, "a");
  c.outline("k", null);
}
function pad(c, f) { // arena pad: three cells in a row, an arrow carrying state from cell to cell
  slab(c);
  c.rect(1, 1, 14, 14, "p"); c.rect(2, 2, 12, 12, "e");
  for (let i = 0; i < 3; i++) c.rect(3, 3 + i * 4, 10, 3, "f");
  for (let i = 0; i < 3; i++) c.rect(4, 4 + i * 4, 8, 1, f && i === 1 ? "z" : "h");
  const ay = f ? 6 : 2; // the carried state hops down the chain
  c.rect(7, ay, 2, 3, "y");
  c.rect(6, ay + 2, 4, 1, "y");
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
writeFileSync("game/sprites/tiles/recurrent-rapids-tiles.ts", toModule({
  id: "recurrent-rapids-tiles", name: "CONV CAVERNS TILES", exportName: "RECURRENT_RAPIDS_TILES", w: T, h: T, palette: PAL, fps, anims,
  doc: "Recurrent Rapids tileset, 16×16 opaque tiles (a river gorge: mossy bank, rushing water with chevron foam, reed clusters, loop-arrow signboards, a chained time-step pillar and an arena pad where a state arrow hops down a row of cells). `idle` is an alias of `grass`.",
  generator: "scripts/art/recurrent-rapids.mjs",
}));
console.log("wrote recurrent rapids tiles");
