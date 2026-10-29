// Generates game/sprites/tiles/python-port.ts: the Python Port tileset.
// 16x16 tiles (objects may span several tiles: widths/heights are multiples of 16).
// Ground tiles are opaque; object tiles are transparent with a dark outline.
// Original designs: a harbour town with teal roofs and a bright Neural Lab.
import { writeFileSync } from "node:fs";
import { Canvas } from "./raster.mjs";

const pal = {
  k: "#150f26",
  // grass
  a: "#2a5f36", b: "#3b8043", c: "#58a458", d: "#8bcb6e",
  // stone / cobble
  e: "#4f4c66", f: "#6f6c8a", g: "#9592b0", h: "#c2c0d6",
  // water
  i: "#17487f", j: "#2670b0", l: "#4a9fd6", m: "#a6e0f2",
  // wood
  n: "#4f3220", o: "#744a2a", p: "#9c6a3a", q: "#c8975a",
  // brick
  r: "#6e2a36", s: "#9a4150", t: "#c2655f",
  // teal roof
  u: "#10555f", v: "#1b7a86", x: "#33a8aa", y: "#f2c744",
  // lab wall ramp
  1: "#4d5a7a", 2: "#6c7b9c", 3: "#93a5c4", 4: "#bccbe0",
  // lab floor
  L: "#dde5ef", M: "#c9d3e3", N: "#a4b1c8",
  // sand
  S: "#d6ba76", T: "#c0a25e", U: "#ebd596",
  // metal
  C: "#8a92aa", D: "#5b6380", E: "#363c58",
  // glow
  F: "#5cff9a", G: "#ff5a6a", H: "#6df0f7", I: "#10303f",
  // paper / white
  A: "#f1e8cf", W: "#ffffff", B: "#c9bb9a",
  // rug
  J: "#46366f", K: "#6a549b", Z: "#3d6fb6",
  // accents
  P: "#e86aa0", Q: "#f0904a", R: "#c4562e", V: "#8e3fbf",
  // sky
  X: "#8fd0ee", Y: "#d7f0fa",
};

const rng = (seed) => {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
};
const mk = (w = 16, h = 16) => new Canvas(w, h);
const put = (c, x, y, ch) => c.set(x, y, ch, 0);
const fill = (c, ch) => c.rect(0, 0, c.w, c.h, ch, 0);

const tiles = {};
const add = (name, w, h, frames, opts = {}) => {
  tiles[name] = { w, h, frames: frames.map((f) => f.rows()), ...opts };
};

// ---------- terrain ----------
function grass(seed, flowers) {
  const r = rng(seed);
  const c = mk();
  fill(c, "b");
  for (let i = 0; i < 16; i++) put(c, (r() * 16) | 0, (r() * 16) | 0, "a");
  for (let i = 0; i < 12; i++) put(c, (r() * 16) | 0, (r() * 16) | 0, "c");
  for (let i = 0; i < 4; i++) {
    const x = (r() * 14) | 0, y = (r() * 13) | 0;
    put(c, x, y, "d");
    put(c, x + 1, y + 1, "c");
    put(c, x - 1, y + 1, "c");
  }
  if (flowers)
    for (let i = 0; i < 3; i++) {
      const x = 2 + ((r() * 11) | 0), y = 2 + ((r() * 11) | 0);
      const col = ["W", "P", "y"][i % 3];
      put(c, x, y, "y");
      if (col !== "y") for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) put(c, x + dx, y + dy, col);
      else for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) put(c, x + dx, y + dy, "W");
    }
  return c;
}
add("grass", 16, 16, [grass(11)]);
add("grass-b", 16, 16, [grass(23)]);
add("grass-flowers", 16, 16, [grass(37, true)]);

function cobble(seed) {
  const r = rng(seed);
  const c = mk();
  fill(c, "f");
  for (let row = 0; row < 4; row++) {
    const y = row * 4;
    const off = row % 2 ? 4 : 0;
    for (let x = 0; x < 16; x++) put(c, x, y + 3, "e");
    for (let sx = off; sx < off + 16; sx += 8) {
      const x0 = sx % 16;
      for (let yy = y; yy < y + 3; yy++) put(c, x0, yy, "e");
      put(c, x0 + 1, y, "g");
      put(c, x0 + 2, y, "g");
      put(c, x0 + 1, y + 1, "g");
      if (r() > 0.5) put(c, x0 + 4, y + 1, "h");
    }
  }
  return c;
}
add("cobble", 16, 16, [cobble(5)]);
add("cobble-b", 16, 16, [cobble(19)]);

function plaza(emblem) {
  const c = mk();
  fill(c, "f");
  for (let i = 0; i < 16; i++) {
    put(c, i, 7, "e");
    put(c, i, 15, "e");
    put(c, 7, i, "e");
    put(c, 15, i, "e");
  }
  for (const [ox, oy] of [[0, 0], [8, 0], [0, 8], [8, 8]]) {
    for (let i = 0; i < 6; i++) put(c, ox + i, oy, "g");
    for (let i = 0; i < 5; i++) put(c, ox, oy + i, "g");
    put(c, ox + 1, oy + 1, "h");
    put(c, ox + 6, oy + 6, "e");
  }
  if (emblem) {
    // a four-node diamond (input layer, hidden, output) in the town colours
    fill(c, "f");
    c.disc(8, 8, 7, 7, "e", 0);
    c.disc(8, 8, 6, 6, "g", 0);
    c.disc(8, 8, 5, 5, "f", 0);
    const nodes = [[8, 3], [3, 8], [13, 8], [8, 13]];
    for (const [x, y] of nodes) c.line(8, 8, x, y, "Z", 0);
    for (const [x, y] of nodes) {
      c.disc(x + 0.5, y + 0.5, 1.6, 1.6, "y", 0);
    }
    c.disc(8, 8, 2, 2, "Z", 0);
    put(c, 7, 7, "H");
    put(c, 8, 7, "H");
  }
  return c;
}
add("plaza", 16, 16, [plaza(false)]);
add("plaza-emblem", 16, 16, [plaza(true)]);

function waterBase(c, phase, h = 16, shoreStart = 0) {
  const t = phase / 4;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < 16; x++) {
      const v = Math.sin(2 * Math.PI * (x * 2 / 16 + t)) + Math.sin(2 * Math.PI * (y / 16 * 2 - t)) + Math.sin(2 * Math.PI * ((x + y) / 16 - t * 2));
      let ch = "j";
      if (v > 2.05) ch = "m";
      else if (v > 1.0) ch = "l";
      else if (v < -1.4) ch = "i";
      put(c, x, y + shoreStart, ch);
    }
}
add("water", 16, 16, [0, 1, 2, 3].map((p) => { const c = mk(); waterBase(c, p); return c; }), { fps: 3 });

function sandTile(seed) {
  const r = rng(seed);
  const c = mk();
  fill(c, "S");
  for (let i = 0; i < 22; i++) put(c, (r() * 16) | 0, (r() * 16) | 0, r() > 0.4 ? "T" : "U");
  return c;
}
add("sand", 16, 16, [sandTile(3)]);
add("shore", 16, 16, [0, 1, 2, 3].map((p) => {
  const c = sandTile(3);
  waterBase(c, p, 8);
  for (let x = 0; x < 16; x++) {
    const y = 8 + Math.round(Math.sin(2 * Math.PI * (x / 16 * 2 + p / 4)) * 0.9);
    put(c, x, y, "W");
    put(c, x, y + 1, "m");
    put(c, x, y + 2, "T");
  }
  return c;
}), { fps: 3 });

function dock(seed) {
  const r = rng(seed);
  const c = mk();
  for (let row = 0; row < 4; row++) {
    const y = row * 4;
    for (let x = 0; x < 16; x++) {
      put(c, x, y, "q");
      put(c, x, y + 1, "p");
      put(c, x, y + 2, "p");
      put(c, x, y + 3, "n");
    }
    const seam = (row * 7 + 5) % 16;
    for (let yy = y; yy < y + 4; yy++) put(c, seam, yy, "n");
    put(c, (seam + 8) % 16, y + 1, "o");
    put(c, (seam + 3) % 16, y + 1, "o");
    if (r() > 0.4) put(c, (seam + 11) % 16, y + 2, "o");
  }
  return c;
}
add("dock", 16, 16, [dock(2)]);

// ---------- lab floors ----------
function labFloor(variant) {
  const c = mk();
  if (variant === 0) {
    for (const [ox, oy, col] of [[0, 0, "L"], [8, 0, "M"], [0, 8, "M"], [8, 8, "L"]]) {
      c.rect(ox, oy, 8, 8, col, 0);
      for (let i = 0; i < 8; i++) {
        put(c, ox + 7, oy + i, "N");
        put(c, ox + i, oy + 7, "N");
      }
      put(c, ox + 1, oy + 1, "W");
      put(c, ox + 2, oy + 1, "W");
    }
  } else {
    fill(c, "L");
    for (let i = 0; i < 16; i++) {
      put(c, i, 15, "N");
      put(c, 15, i, "N");
    }
    for (const [x, y] of [[1, 1], [13, 1], [1, 13], [13, 13]]) {
      put(c, x, y, "C");
      put(c, x + 1, y, "N");
    }
    // a faint circuit trace
    for (let x = 3; x < 13; x++) put(c, x, 8, "M");
    put(c, 8, 7, "M");
    put(c, 8, 6, "M");
  }
  return c;
}
add("floor-lab", 16, 16, [labFloor(0)]);
add("floor-lab-b", 16, 16, [labFloor(1)]);

function doormat() {
  const c = labFloor(0);
  c.rect(1, 3, 14, 11, "n", 0);
  c.rect(2, 4, 12, 9, "o", 0);
  for (let y = 5; y < 13; y += 2) for (let x = 3; x < 13; x++) put(c, x, y, (x + y) % 4 < 2 ? "p" : "q");
  for (let x = 2; x < 14; x++) put(c, x, 13, "n");
  return c;
}
add("doormat", 16, 16, [doormat()]);

function rug(sides) {
  const c = mk();
  fill(c, "K");
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if ((x + y) % 8 === 0 || (x - y + 16) % 8 === 0) put(c, x, y, "J");
  for (const [x, y] of [[4, 4], [12, 4], [4, 12], [12, 12]]) put(c, x, y, "y");
  put(c, 8, 8, "y");
  if (sides.includes("t")) { for (let x = 0; x < 16; x++) { put(c, x, 0, "y"); put(c, x, 1, "Z"); put(c, x, 2, "J"); } }
  if (sides.includes("b")) { for (let x = 0; x < 16; x++) { put(c, x, 15, "y"); put(c, x, 14, "Z"); put(c, x, 13, "J"); } for (let x = 0; x < 16; x += 2) put(c, x, 15, "A"); }
  if (sides.includes("l")) { for (let y = 0; y < 16; y++) { put(c, 0, y, "y"); put(c, 1, y, "Z"); put(c, 2, y, "J"); } }
  if (sides.includes("r")) { for (let y = 0; y < 16; y++) { put(c, 15, y, "y"); put(c, 14, y, "Z"); put(c, 13, y, "J"); } }
  return c;
}
for (const s of ["", "t", "b", "l", "r", "tl", "tr", "bl", "br"]) add(`rug${s ? "-" + s : ""}`, 16, 16, [rug(s)]);

// ---------- walls and roofs ----------
function labWall() {
  const c = mk();
  fill(c, "3");
  for (let x = 0; x < 16; x++) { put(c, x, 0, "4"); put(c, x, 15, "2"); put(c, x, 14, "2"); }
  for (let y = 0; y < 16; y++) { put(c, 0, y, "2"); put(c, 15, y, "4"); }
  for (const [x, y] of [[3, 3], [12, 3], [3, 11], [12, 11]]) { put(c, x, y, "1"); put(c, x - 1, y - 1, "4"); }
  return c;
}
add("wall-lab", 16, 16, [labWall()], { solid: true });
function labBase() {
  const c = mk();
  fill(c, "2");
  c.rect(0, 0, 16, 2, "4", 0);
  c.rect(0, 2, 16, 2, "x", 0);
  c.rect(0, 4, 16, 1, "u", 0);
  for (let x = 0; x < 16; x += 4) put(c, x, 6, "3");
  for (let x = 2; x < 16; x += 4) put(c, x, 10, "1");
  c.rect(0, 14, 16, 2, "1", 0);
  c.rect(0, 13, 16, 1, "D", 0);
  return c;
}
add("wall-lab-base", 16, 16, [labBase()], { solid: true });

function brick(seed) {
  const r = rng(seed);
  const c = mk();
  fill(c, "s");
  for (let row = 0; row < 4; row++) {
    const y = row * 4;
    for (let x = 0; x < 16; x++) put(c, x, y + 3, "B");
    const off = row % 2 ? 4 : 0;
    for (let sx = off; sx < off + 16; sx += 8) {
      for (let yy = y; yy < y + 3; yy++) put(c, sx % 16, yy, "B");
      put(c, (sx + 1) % 16, y, "t");
      put(c, (sx + 2) % 16, y, "t");
      if (r() > 0.55) put(c, (sx + 5) % 16, y + 1, "r");
    }
  }
  return c;
}
add("wall-brick", 16, 16, [brick(8)], { solid: true });

function windowTile() {
  const c = mk();
  fill(c, "s");
  c.rect(2, 2, 12, 11, "n", 0);
  c.rect(3, 3, 10, 9, "l", 0);
  c.rect(3, 3, 10, 3, "m", 0);
  for (let i = 0; i < 4; i++) put(c, 4 + i, 5 - Math.min(i, 2) + 1 - 1, "W");
  c.rect(7, 3, 2, 9, "n", 0);
  c.rect(3, 7, 10, 1, "n", 0);
  c.rect(1, 13, 14, 2, "B", 0);
  c.rect(1, 15, 14, 1, "r", 0);
  put(c, 4, 4, "W");
  put(c, 10, 9, "m");
  return c;
}
add("window", 16, 16, [windowTile()], { solid: true });

function doorTile() {
  const c = mk();
  fill(c, "s");
  c.rect(2, 1, 12, 15, "n", 0);
  c.rect(3, 2, 10, 14, "p", 0);
  for (let x = 3; x < 13; x += 3) for (let y = 2; y < 16; y++) put(c, x, y, "o");
  c.rect(3, 2, 10, 1, "q", 0);
  for (let y = 4; y < 14; y++) { put(c, 3, y, "q"); }
  c.rect(5, 4, 6, 5, "o", 0);
  c.rect(6, 5, 4, 3, "l", 0);
  put(c, 6, 5, "m");
  put(c, 7, 5, "m");
  put(c, 11, 10, "y");
  put(c, 11, 11, "y");
  c.rect(2, 15, 12, 1, "B", 0);
  return c;
}
add("door", 16, 16, [doorTile()], { solid: false });

function roof(kind) {
  const c = mk();
  fill(c, "v");
  for (let row = 0; row < 4; row++) {
    const y = row * 4;
    const off = row % 2 ? 4 : 0;
    for (let x = 0; x < 16; x++) {
      const m = (x + off) % 8;
      const scallop = m < 4 ? m : 7 - m;
      put(c, x, y + 3, "u");
      if (scallop === 0) put(c, x, y + 2, "u");
      put(c, x, y, scallop < 2 ? "x" : "v");
    }
  }
  if (kind === "eave") {
    c.rect(0, 12, 16, 4, "u", 0);
    for (let x = 0; x < 16; x++) put(c, x, 12, "x");
    c.rect(0, 15, 16, 1, "E", 0);
  }
  if (kind === "ridge") {
    c.rect(0, 0, 16, 3, "x", 0);
    c.rect(0, 3, 16, 1, "u", 0);
  }
  return c;
}
add("roof", 16, 16, [roof("plain")], { solid: true });
add("roof-eave", 16, 16, [roof("eave")], { solid: true });
add("roof-ridge", 16, 16, [roof("ridge")], { solid: true });

// ---------- outdoor objects ----------
function tree() {
  const c = mk(16, 32);
  c.rect(6, 20, 4, 11, "o");
  c.rect(6, 20, 1, 11, "p");
  c.rect(9, 20, 1, 11, "n");
  c.ellipse(8, 11, 7.5, 9, ["a", "b", "c", "d"]);
  c.ellipse(5, 14, 5, 6, ["a", "b", "c", "c"]);
  c.ellipse(11, 14, 5, 6, ["a", "a", "b", "c"]);
  put(c, 7, 4, "d");
  return c;
}
{
  const c = tree();
  c.outline("k", null);
  tiles.tree = { w: 16, h: 32, frames: [c.rows()], solid: true };
}
function bush() {
  const c = mk();
  c.ellipse(8, 10, 7, 5, ["a", "b", "c", "d"]);
  c.ellipse(4, 11, 3.5, 3.5, ["a", "b", "c", "c"]);
  put(c, 6, 7, "d");
  put(c, 11, 9, "P");
  put(c, 5, 11, "P");
  return c;
}
{ const c = bush(); c.outline("k", null); tiles.bush = { w: 16, h: 16, frames: [c.rows()], solid: true }; }

function crate(stack) {
  const c = mk(16, 16);
  const box = (x, y, s) => {
    c.rect(x, y, s, s, "p");
    c.rect(x, y, s, 1, "q");
    c.rect(x, y, 1, s, "q");
    c.rect(x, y + s - 1, s, 1, "n");
    c.rect(x + s - 1, y, 1, s, "n");
    c.line(x + 1, y + 1, x + s - 2, y + s - 2, "o");
    c.line(x + s - 2, y + 1, x + 1, y + s - 2, "o");
  };
  if (stack) { box(1, 7, 8); box(8, 6, 7); box(4, 0, 8); } else box(2, 3, 12);
  c.outline("k", null);
  return c;
}
add("crate", 16, 16, [crate(false)], { solid: true });
add("crates", 16, 16, [crate(true)], { solid: true });

function barrel() {
  const c = mk();
  c.ellipse(8, 9, 5.5, 7, ["n", "o", "p", "q"]);
  c.rect(3, 6, 10, 1, "D");
  c.rect(3, 11, 10, 1, "D");
  c.disc(8, 3.5, 4, 1.7, "q");
  c.outline("k", null);
  return c;
}
add("barrel", 16, 16, [barrel()], { solid: true });

function bollard() {
  const c = mk();
  c.rect(5, 7, 6, 7, "D");
  c.rect(5, 7, 2, 7, "C");
  c.rect(5, 10, 6, 2, "y");
  c.ellipse(8, 7, 4, 2.2, ["D", "C", "C", "g"]);
  c.outline("k", null);
  return c;
}
add("bollard", 16, 16, [bollard()], { solid: true });

function lamp(on) {
  const c = mk(16, 32);
  c.rect(7, 10, 2, 20, "D");
  c.rect(7, 10, 1, 20, "C");
  c.rect(5, 28, 6, 3, "E");
  c.rect(4, 3, 8, 8, "E");
  c.rect(5, 4, 6, 6, on ? "y" : "A");
  c.rect(6, 5, 4, 4, on ? "W" : "y");
  c.rect(4, 2, 8, 1, "v");
  c.rect(5, 1, 6, 1, "u");
  c.outline("k", null);
  return c;
}
tiles.lamp = { w: 16, h: 32, frames: [lamp(true).rows(), lamp(false).rows()], solid: true, fps: 1.5 };

function sign() {
  const c = mk(16, 32);
  c.rect(7, 12, 2, 18, "o");
  c.rect(7, 12, 1, 18, "p");
  c.rect(1, 3, 14, 11, "p");
  c.rect(1, 3, 14, 1, "q");
  c.rect(1, 13, 14, 1, "n");
  c.rect(2, 4, 12, 8, "u");
  // the town logo: a blue and a yellow node linked by a loop
  c.disc(6, 8, 2.2, 2.2, "Z");
  c.disc(10, 8, 2.2, 2.2, "y");
  c.line(6, 6, 10, 6, "W");
  c.line(6, 10, 10, 10, "W");
  c.outline("k", null);
  return c;
}
add("sign", 16, 32, [sign()], { solid: true });

function container(body, ribs, hi) {
  const c = mk(32, 16);
  c.rect(1, 2, 30, 13, body);
  c.rect(1, 2, 30, 2, hi);
  for (let x = 3; x < 29; x += 3) c.rect(x, 4, 1, 10, ribs);
  c.rect(1, 14, 30, 1, ribs);
  c.rect(26, 4, 4, 10, "C");
  c.rect(27, 5, 1, 8, "E");
  c.rect(29, 5, 1, 8, "E");
  c.rect(26, 8, 4, 1, "y");
  c.outline("k", null);
  return c;
}
add("container", 32, 16, [container("v", "u", "x")], { solid: true });
add("container-b", 32, 16, [container("R", "r", "Q")], { solid: true });

function fence() {
  const c = mk();
  c.rect(0, 6, 16, 2, "q");
  c.rect(0, 10, 16, 2, "p");
  for (const x of [1, 11]) { c.rect(x, 3, 3, 12, "o"); c.rect(x, 3, 1, 12, "p"); }
  c.outline("k", null);
  return c;
}
add("fence", 16, 16, [fence()], { solid: true });

function flowerbed() {
  const c = mk();
  c.rect(1, 8, 14, 7, "o");
  c.rect(1, 8, 14, 1, "q");
  c.rect(2, 9, 12, 5, "n");
  for (let x = 3; x < 14; x += 3) {
    c.line(x, 8, x, 5, "c");
    c.disc(x, 4, 1.6, 1.6, ["P", "y", "W", "Q"][(x / 3) % 4 | 0]);
  }
  c.outline("k", null);
  return c;
}
add("flowerbed", 16, 16, [flowerbed()], { solid: true });

function boat(f) {
  const c = mk(32, 32);
  const bob = f ? 1 : 0;
  c.ellipse(16, 24 + bob, 14, 5, ["n", "o", "p", "q"]);
  c.rect(2, 20 + bob, 28, 3, "p");
  c.rect(2, 20 + bob, 28, 1, "q");
  c.rect(15, 4 + bob, 2, 17, "o");
  c.rect(17, 5 + bob, 9, 10, "A");
  c.rect(17, 5 + bob, 9, 1, "W");
  c.line(17, 15 + bob, 26, 15 + bob, "B");
  c.rect(10, 22 + bob, 3, 3, "y");
  c.rect(15, 3 + bob, 5, 2, "G");
  c.outline("k", null);
  return c;
}
tiles.boat = { w: 32, h: 32, frames: [boat(0).rows(), boat(1).rows()], solid: true, fps: 1.5 };

// ---------- lab objects ----------
function windowLab() {
  const c = mk(16, 32);
  c.rect(1, 3, 14, 24, "D");
  c.rect(2, 4, 12, 22, "X");
  c.rect(2, 4, 12, 6, "Y");
  c.rect(2, 10, 12, 4, "X");
  c.ellipse(6, 8, 3.2, 1.6, ["W", "W", "W", "W"]);
  c.ellipse(10, 18, 2.6, 1.3, ["Y", "Y", "W", "W"]);
  c.rect(7, 4, 2, 22, "C");
  c.rect(2, 14, 12, 2, "C");
  c.rect(0, 26, 16, 3, "C");
  c.rect(0, 28, 16, 1, "D");
  c.line(3, 5, 5, 5, "W");
  c.outline("k", null);
  return c;
}
add("window-lab", 16, 32, [windowLab()], { solid: true });

function whiteboard() {
  const c = mk(48, 32);
  c.rect(1, 3, 46, 26, "C");
  c.rect(1, 3, 46, 1, "W");
  c.rect(2, 4, 44, 23, "W");
  c.rect(2, 26, 44, 1, "M");
  // scatter plot with a fitted line
  c.line(5, 22, 5, 7, "E");
  c.line(5, 22, 24, 22, "E");
  const pts = [[8, 19], [10, 17], [12, 18], [14, 14], [17, 13], [19, 10], [21, 11], [23, 8]];
  for (const [x, y] of pts) { put(c, x, y, "Z"); put(c, x + 1, y, "Z"); }
  c.line(6, 20, 23, 9, "G");
  // equation scribbles: y = w x + b
  for (const [x, y, len] of [[28, 8, 10], [28, 13, 14], [28, 18, 8]]) for (let i = 0; i < len; i += 2) { put(c, x + i, y, "Z"); put(c, x + i + 1, y + (i % 4 ? 0 : 1), "Z"); }
  c.rect(37, 8, 6, 1, "F");
  // loss curve
  for (let x = 0; x < 10; x++) put(c, 34 + x, 23 - Math.round(4 * Math.exp(-x / 3)) , "G");
  c.rect(4, 28, 40, 2, "D");
  c.rect(8, 27, 6, 1, "G");
  c.rect(16, 27, 5, 1, "Z");
  c.outline("k", null);
  return c;
}
add("whiteboard", 48, 32, [whiteboard()], { solid: true });

function bookshelf(seed) {
  const r = rng(seed);
  const c = mk(16, 32);
  c.rect(1, 1, 14, 30, "o");
  c.rect(1, 1, 14, 1, "q");
  c.rect(2, 2, 12, 28, "n");
  const cols = ["s", "Z", "y", "F", "P", "V", "t", "x"];
  for (let sh = 0; sh < 4; sh++) {
    const y0 = 3 + sh * 7;
    let x = 3;
    while (x < 13) {
      const w = 1 + ((r() * 2) | 0) + 1;
      const h = 4 + ((r() * 3) | 0);
      const col = cols[(r() * cols.length) | 0];
      c.rect(x, y0 + (6 - h), Math.min(w, 13 - x), h, col);
      put(c, x, y0 + (6 - h), "W");
      x += w;
    }
    c.rect(2, y0 + 6, 12, 1, "p");
  }
  c.outline("k", null);
  return c;
}
add("bookshelf", 16, 32, [bookshelf(4)], { solid: true });
add("bookshelf-b", 16, 32, [bookshelf(9)], { solid: true });

function rack(f) {
  const c = mk(16, 32);
  c.rect(1, 1, 14, 30, "D");
  c.rect(1, 1, 14, 1, "C");
  c.rect(2, 2, 12, 28, "E");
  for (let u = 0; u < 6; u++) {
    const y = 3 + u * 4.5 | 0;
    c.rect(3, y, 10, 3, "D");
    c.rect(3, y, 10, 1, "C");
    for (let v = 0; v < 3; v++) put(c, 4 + v * 2, y + 1, "E");
    const phase = (u * 3 + f) % 4;
    put(c, 11, y + 1, phase === 0 ? "G" : "F");
    put(c, 12, y + 1, phase < 2 ? "F" : "I");
  }
  c.rect(4, 30, 8, 1, "k");
  c.outline("k", null);
  return c;
}
tiles["server-rack"] = { w: 16, h: 32, frames: [0, 1, 2, 3].map((f) => rack(f).rows()), solid: true, fps: 4 };

function desk(f) {
  const c = mk(32, 16);
  c.rect(0, 5, 32, 8, "p");
  c.rect(0, 5, 32, 2, "q");
  c.rect(0, 13, 32, 2, "n");
  c.rect(1, 13, 2, 3, "o");
  c.rect(29, 13, 2, 3, "o");
  // monitor
  c.rect(4, 0, 12, 9, "E");
  c.rect(5, 1, 10, 6, "I");
  const lines = [[6, 2, 5], [7, 3, 6], [6, 4, 3], [7, 5, 4]];
  lines.forEach(([x, y, w], i) => c.rect(x, y, w, 1, i === f * 2 % 4 ? "F" : "H"));
  if (f) put(c, 13, 5, "W");
  c.rect(9, 8, 2, 2, "D");
  // keyboard, mug, mouse
  c.rect(5, 10, 9, 2, "C");
  for (let x = 6; x < 13; x += 2) put(c, x, 10, "W");
  c.rect(22, 7, 4, 4, "W");
  c.rect(22, 7, 4, 1, "A");
  put(c, 26, 8, "W");
  put(c, 26, 9, "W");
  c.rect(23, 8, 2, 1, "R");
  c.outline("k", null);
  return c;
}
tiles.desk = { w: 32, h: 16, frames: [desk(0).rows(), desk(1).rows()], solid: true, fps: 2 };

function chair() {
  const c = mk();
  c.rect(4, 2, 8, 7, "Z");
  c.rect(4, 2, 8, 1, "H");
  c.ellipse(8, 10, 5, 3, ["D", "Z", "Z", "H"]);
  c.rect(7, 12, 2, 2, "D");
  c.line(4, 14, 12, 14, "D");
  c.outline("k", null);
  return c;
}
add("chair", 16, 16, [chair()], { solid: false });

function plant() {
  const c = mk();
  c.ellipse(5, 6, 3, 4.5, ["a", "b", "c", "d"], { angle: -0.5 });
  c.ellipse(11, 6, 3, 4.5, ["a", "b", "c", "c"], { angle: 0.5 });
  c.ellipse(8, 4, 2.5, 4, ["a", "b", "c", "d"]);
  c.rect(4, 9, 8, 6, "R");
  c.rect(4, 9, 8, 1, "Q");
  c.rect(5, 14, 6, 1, "r");
  c.outline("k", null);
  return c;
}
add("plant", 16, 16, [plant()], { solid: true });

function coffee() {
  const c = mk();
  c.rect(3, 1, 10, 13, "D");
  c.rect(3, 1, 10, 2, "C");
  c.rect(5, 4, 6, 4, "E");
  put(c, 6, 5, "G");
  c.rect(5, 9, 6, 3, "I");
  c.rect(7, 10, 2, 3, "W");
  c.rect(4, 13, 8, 2, "E");
  c.outline("k", null);
  return c;
}
add("coffee", 16, 16, [coffee()], { solid: true });

function gpu(f) {
  const c = mk(32, 16);
  c.rect(1, 3, 30, 11, "E");
  c.rect(1, 3, 30, 1, "C");
  c.rect(2, 4, 28, 9, "I");
  for (const cx of [9, 22]) {
    c.disc(cx, 8.5, 5, 5, "D");
    c.disc(cx, 8.5, 4, 4, "E");
    const a = f ? Math.PI / 4 : 0;
    for (let k = 0; k < 4; k++) {
      const th = a + (k * Math.PI) / 2;
      c.line(cx, 8, cx + Math.round(Math.cos(th) * 3.3), 8 + Math.round(Math.sin(th) * 3.3), "C");
    }
    put(c, cx, 8, "W");
  }
  c.rect(14, 10, 3, 1, "F");
  c.rect(14, 12, 3, 1, f ? "F" : "G");
  c.rect(3, 13, 26, 1, "F");
  c.rect(2, 14, 4, 2, "D");
  c.rect(26, 14, 4, 2, "D");
  c.outline("k", null);
  return c;
}
tiles["gpu-rig"] = { w: 32, h: 16, frames: [gpu(0).rows(), gpu(1).rows()], solid: true, fps: 6 };

function pupBed() {
  const c = mk();
  c.ellipse(8, 9, 7, 5, ["Z", "x", "H", "H"]);
  c.ellipse(8, 9, 4.5, 3, ["u", "v", "x", "x"]);
  c.rect(11, 5, 3, 2, "y");
  c.outline("k", null);
  return c;
}
add("pup-bed", 16, 16, [pupBed()], { solid: false });

function poster() {
  const c = mk();
  c.rect(2, 1, 12, 14, "A");
  c.rect(2, 1, 12, 1, "W");
  c.rect(2, 14, 12, 1, "B");
  // a tiny 2-3-1 network
  const L = [[5, 5], [5, 8], [5, 11]];
  const M = [[8, 6], [8, 10]];
  const O = [[11, 8]];
  for (const a of L) for (const b of M) c.line(a[0], a[1], b[0], b[1], "C");
  for (const a of M) for (const b of O) c.line(a[0], a[1], b[0], b[1], "C");
  for (const [x, y] of L) put(c, x, y, "Z");
  for (const [x, y] of M) put(c, x, y, "R");
  for (const [x, y] of O) put(c, x, y, "y");
  c.outline("k", null);
  return c;
}
add("poster", 16, 16, [poster()], { solid: false });

function labSign() {
  const c = mk(32, 16);
  c.rect(1, 2, 30, 12, "E");
  c.rect(1, 2, 30, 1, "C");
  c.rect(2, 3, 28, 10, "I");
  c.rect(1, 13, 30, 1, "D");
  // glyph: a neuron with three dendrites and an axon, then "NC" blocks
  c.disc(8, 8, 2.4, 2.4, "H");
  for (const [x, y] of [[3, 4], [3, 8], [3, 12]]) c.line(x, y, 6, 8, "F");
  c.line(10, 8, 15, 8, "F");
  for (const x of [18, 19, 20, 24, 25, 26]) { put(c, x, 5, "H"); put(c, x, 11, "H"); }
  for (let y = 5; y <= 11; y++) { put(c, 18, y, "H"); put(c, 20, y, "H"); put(c, 24, y, "H"); }
  put(c, 19, 7, "H"); put(c, 19, 8, "H");
  put(c, 25, 7, "H");
  c.outline("k", null);
  return c;
}
add("lab-sign", 32, 16, [labSign()], { solid: true });

// ---------- write the module ----------
const entries = Object.entries(tiles)
  .map(([name, t]) => {
    const frames = t.frames.map((f) => `      [\n${f.map((r) => `        "${r}"`).join(",\n")},\n      ]`).join(",\n");
    return `    ${JSON.stringify(name)}: {\n      w: ${t.w},\n      h: ${t.h},${t.solid ? "\n      solid: true," : ""}${t.fps ? `\n      fps: ${t.fps},` : ""}\n      frames: [\n${frames},\n      ],\n    }`;
  })
  .join(",\n");
const palText = Object.entries(pal).map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(",\n");
writeFileSync(
  "game/sprites/tiles/python-port.ts",
  `// Generated by scripts/art/tiles.mjs, then committed. Edit freely.
import type { TileSetDef } from "../tileset";

/** Python Port: a harbour town (teal roofs, cobbles, water) and the bright Neural Lab interior. 16×16 tiles. */
export const PYTHON_PORT_TILES: TileSetDef = {
  id: "python-port",
  name: "Python Port",
  palette: {
${palText},
  },
  tiles: {
${entries},
  },
};
`,
);
console.log("wrote", Object.keys(tiles).length, "tiles");
