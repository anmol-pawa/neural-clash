// Generates game/sprites/tiles/atoll-tiles.ts
// Attention Atoll: a coral atoll where everything attends. Pearls glow in proportion to a query's attention, the signboard shows a softmax row, the arena pad is one query pearl and four key pearls with a highlight that hops between them. Original.
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
  a: "#b09a5c", b: "#cdb878", c: "#e2d29a", d: "#f2e8b8", // sand
  e: "#7a6a58", f: "#9a8a74", h: "#b8a88e", i: "#d8ccb4", // driftwood planks
  l: "#0a5a78", m: "#14a0b4", n: "#58d4d0", o: "#e0fff8", // lagoon
  p: "#2c2018", q: "#4a3626", r: "#6a4e36", // dark timber
  s: "#c04a5a", t: "#e8706a", u: "#ff9c88", // coral roof
  v: "#e8dcd0", w: "#f6eee4", x: "#fffaf4", // shell plaster
  y: "#ffd870", z: "#ff7ab0", // pearl gold and attention pink
  1: "#fff4b8", 2: "#ffffff",
  3: "#1a6a3a", 4: "#2c9a4c", 5: "#5cc86a", 6: "#a4ec8c", // palm
  7: "#7a8a96", 8: "#a8b6c0", 9: "#5a6872", g: "#c4d0d8", j: "#e4ecf0",
};

function bank(c, seed, sway = 0, pebbles = true) { // sandy atoll turf with shell flecks
  fillAll(c, "c");
  speckle(c, seed, ["b", "d", "b"], 24);
  speckle(c, seed + 7, ["a"], 4);
  if (pebbles) { const r = rng(seed + 3); const x = 2 + Math.floor(r() * 10), y = 2 + Math.floor(r() * 10); c.set(x, y, "x", -1); c.set(x + 1, y, "u", -1); c.set(x, y + 1, "t", -1); }
  if (sway) { c.set(4, 12, "d", -1); c.set(11, 3, "d", -1); }
}
function reeds(c, sway) { // sea grass with pink anemone heads
  bank(c, 11, sway, false);
  for (const [x, h] of [[2, 9], [6, 11], [10, 8], [13, 10]]) {
    const lean = sway && x % 2 ? 1 : 0;
    c.rect(x, 15 - h, 1, h, "4"); c.rect(x + 1, 15 - h + 2, 1, h - 2, "3");
    c.rect(x + lean, 15 - h - 2, 2, 3, "t"); c.set(x + lean, 15 - h - 2, "z", -1);
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
function willowTop(c, f) { // palm crown with arching fronds
  bank(c, 21, 0, false);
  const fr = [[8, 6, -7, -2], [8, 6, 7, -2], [8, 6, -5, 4], [8, 6, 5, 4], [8, 6, 0, -5]];
  for (const [x, y, dx, dy] of fr) { const sag = f && dx ? 1 : 0; c.line(x, y, x + dx, y + dy + sag, "4", 1); c.line(x, y + 1, x + dx, y + dy + 1 + sag, "3", -1); }
  c.disc(8, 6, 3, 3, "5", 2);
  c.rect(7, 4, 2, 1, "6"); c.set(5, 6, "6", -1);
  c.set(7, 8, "r", -1); c.set(9, 8, "r", -1);
  c.outline("k", null);
}
function trunk(c) { // curved palm trunk with ring bands
  bank(c, 22, 0, false);
  for (let y = 0; y < 15; y++) { const x = 6 + Math.round(Math.sin(y / 5) * 1.5); c.rect(x, y, 4, 1, y % 3 ? "r" : "q"); c.set(x, y, "f", -1); }
  c.rect(4, 13, 8, 2, "r"); c.rect(4, 13, 8, 1, "f");
  c.outline("k", null);
}
function rail(c) { // post and rope rail
  bank(c, 31, 0);
  for (const x of [1, 6, 11]) { c.rect(x, 5, 3, 9, "r"); c.rect(x, 5, 1, 9, "e"); }
  c.rect(0, 7, T, 1, "i"); c.rect(0, 8, T, 1, "e"); c.rect(0, 11, T, 1, "i"); c.rect(0, 12, T, 1, "e");
  c.outline("k", null);
}
function signboard(c, f) { // softmax row: five pearl bars, the tallest hops between pearls
  bank(c, 41, 0, false);
  c.rect(7, 11, 2, 5, "q"); c.rect(7, 11, 1, 5, "r");
  c.rect(1, 1, 14, 11, "q"); c.rect(2, 2, 12, 9, "p");
  c.rect(2, 2, 12, 1, "r");
  const hs = f ? [1, 2, 3, 6, 2] : [2, 6, 3, 1, 2];
  hs.forEach((h, i) => { const x = 3 + i * 2; c.rect(x, 10 - h, 1, h, "n"); c.set(x, 10 - h, h > 5 ? "z" : "o", -1); });
  c.rect(5, 15, 6, 1, "a");
  c.outline("k", null);
}
function lantern(c, f) { // glowing pearl lantern on a post
  planks(c);
  c.rect(7, 6, 2, 10, "r"); c.rect(7, 6, 1, 10, "f");
  c.rect(5, 14, 6, 2, "9"); c.rect(5, 14, 6, 1, "8");
  c.disc(8, 4, 4, 4, "t", 1); c.disc(8, 4, 3, 3, f ? "2" : "1", 2); c.set(7, 3, "2", -1);
  c.rect(5, 8, 6, 1, "p");
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
function windowTile(c, f) { // round-ish window with a drifting light mote
  wall(c);
  c.rect(3, 2, 10, 11, "p"); c.rect(4, 3, 8, 9, "l");
  c.rect(4, 3, 8, 1, "m");
  for (let x = 5; x < 11; x++) c.set(x, 6 + (x % 2), "n", -1);
  const dx = f ? 9 : 6; c.set(dx, 9, "y", -1); c.set(dx + 1, 9, "1", -1);
  c.rect(2, 13, 12, 2, "r");
}
function door(c, f) { // door with a pearl glyph
  wall(c);
  c.rect(2, 1, 12, 15, "p"); c.rect(3, 2, 10, 14, "q");
  c.rect(7, 2, 2, 14, "p");
  c.disc(8, 8, 3, 3, f ? "1" : "y", 1); c.set(7, 7, "2", -1);
  c.rect(5, 1, 6, 1, "u");
}
function wheel(c, f) { // pearl pedestal: a query shell with five pearls whose glow rotates
  bank(c, 61, 0);
  c.rect(3, 12, 10, 4, "9"); c.rect(3, 12, 10, 1, "g");
  c.rect(5, 9, 6, 3, "8"); c.rect(5, 9, 6, 1, "j");
  const ps = [[3, 4], [6, 2], [9, 2], [12, 4], [8, 6]];
  ps.forEach(([x, y], i) => { const hot = (i + f) % 3 === 0; c.disc(x, y, 2, 2, hot ? "z" : "o", hot ? 2 : 1); c.set(x - 1, y - 1, "2", -1); });
  c.outline("k", null, new Set(["z"]));
}
function bench(c) { // timber bench
  bank(c, 71, 0, false);
  c.rect(2, 7, 12, 3, "h"); c.rect(2, 7, 12, 1, "i"); c.rect(2, 9, 12, 1, "e");
  c.rect(2, 10, 2, 5, "r"); c.rect(12, 10, 2, 5, "r");
  c.rect(2, 4, 12, 2, "e"); c.rect(2, 4, 12, 1, "f");
  c.rect(2, 15, 12, 1, "a");
  c.outline("k", null);
}
function pad(c, f) { // arena pad: one query pearl (centre) and four key pearls; the attention link hops key to key
  planks(c);
  c.rect(1, 1, 14, 14, "p"); c.rect(2, 2, 12, 12, "l");
  const keys = [[3, 3], [10, 3], [3, 10], [10, 10]];
  const hot = keys[f % 4];
  for (const [x, y] of keys) { c.rect(x, y, 3, 3, "m"); c.set(x + 1, y + 1, "o", -1); }
  c.line(8, 8, hot[0] + 1, hot[1] + 1, "z", -1);
  c.rect(hot[0], hot[1], 3, 3, "z"); c.set(hot[0] + 1, hot[1] + 1, "2", -1);
  c.rect(7, 7, 3, 3, "y"); c.set(8, 8, "2", -1);
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
writeFileSync("game/sprites/tiles/atoll-tiles.ts", toModule({
  id: "atoll-tiles", name: "ATTENTION ATOLL TILES", exportName: "ATOLL_TILES", w: T, h: T, palette: PAL, fps, anims,
  doc: "Attention Atoll tileset, 16×16 opaque tiles (a coral atoll where everything attends: sand, sea grass, palms, a turquoise lagoon, driftwood boardwalks, pearl lanterns, a softmax-row signboard, a pearl pedestal and a query/key pearl arena pad). `idle` is an alias of `grass`.",
  generator: "scripts/art/attention-atoll.mjs",
}));
console.log("wrote attention atoll tiles");
