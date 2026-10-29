// Generates game/tiles/{python-port,lab-interior}.ts: 16x16 tilesets.
// Python Port is a harbour town (teal tile roofs, cobbles, a dock, snake
// banners); the Lab is a tidy research room (servers, whiteboard, a Neuron-Pup
// incubator capsule). Static tiles have one frame; water, lamps, monitors,
// server LEDs, the window and the capsule animate. Original designs.
import { writeFileSync } from "node:fs";
import { Canvas } from "./raster.mjs";

const S = 16;
const hash = (x, y, s = 0) => {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const speckle = (c, x0, y0, w, h, chars, dens, seed) => {
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) {
      const r = hash(x, y, seed);
      if (r < dens) c.set(x, y, chars[Math.floor((r / dens) * chars.length)], 0);
    }
};
const fill = (c, ch) => c.rect(0, 0, c.w, c.h, ch, 0);

// ---------------------------------------------------------------- outdoors
const outPal = {
  k: "#150f26", w: "#ffffff",
  a: "#2f6b3a", b: "#3f8a45", c: "#5aa84f", d: "#86c868", // grass
  e: "#8a7556", f: "#a8916c", g: "#c7b083", h: "#e0cc9e", // cobble
  i: "#1d4f8a", j: "#2a74b8", l: "#4aa0d8", m: "#a6dcf2", // water
  n: "#5a3a22", o: "#7d5230", p: "#a3703f", q: "#c99a5e", // wood
  r: "#9a94b0", s: "#cfc9e0", t: "#7a7498", u: "#5c5778", // plaster wall
  v: "#0d5560", x: "#14808c", y: "#22b0b8", z: "#6fe0dc", // teal roof
  A: "#e8567e", B: "#ffd84a", C: "#f4f4ff", // flowers
  D: "#2a3a6a", E: "#7c8cff", F: "#cfe0ff", // glass
  G: "#ffe27a", H: "#fff6c8", // lamp light
  I: "#3a3f58", J: "#6a7090", K: "#aab0c8", // iron
  L: "#b3405f", M: "#7a2840", // accent
  N: "#1f4f2c", O: "#2e7a3a", P: "#4ca24a", Q: "#8ad66a", // foliage ramp
};
const add = (pal, name, draw, frames = 1, fps) => {
  const fr = [];
  for (let f = 0; f < frames; f++) {
    const c = new Canvas(S, S);
    draw(c, f);
    fr.push(c.rows());
  }
  pal.set(name, { frames: fr, fps });
};
const outTiles = new Map();
const oAdd = (n, d, f, p) => add(outTiles, n, d, f, p);

const grassBase = (c, seed = 1) => {
  fill(c, "b");
  speckle(c, 0, 0, S, S, ["a", "c"], 0.2, seed);
  speckle(c, 0, 0, S, S, ["d"], 0.04, seed + 9);
};
oAdd("grass", (c) => grassBase(c, 1));
oAdd("grass2", (c) => {
  grassBase(c, 5);
  for (const [x, y] of [[3, 4], [11, 10]]) { c.set(x, y, "d", 0); c.set(x, y - 1, "c", 0); c.set(x + 1, y, "c", 0); c.set(x - 1, y, "a", 0); }
});
oAdd("flowers", (c) => {
  grassBase(c, 3);
  const fl = [[3, 4, "A"], [10, 3, "B"], [6, 11, "C"], [12, 12, "A"], [13, 6, "C"]];
  for (const [x, y, ch] of fl) { c.set(x, y, ch, 0); c.set(x, y + 1, "a", 0); c.set(x - 1, y, "d", 0); c.set(x + 1, y, "d", 0); }
});
oAdd("cobble", (c) => {
  fill(c, "e");
  for (let r = 0; r < 4; r++) {
    const off = r % 2 ? 4 : 0;
    for (let sx = -4 + off; sx < S; sx += 8) {
      const x0 = Math.max(0, sx + 1), x1 = Math.min(S - 1, sx + 6);
      if (x1 < x0) continue;
      c.rect(x0, r * 4, x1 - x0 + 1, 3, "f", 0);
      c.rect(x0, r * 4, x1 - x0 + 1, 1, "g", 0);
      if (x1 - x0 > 2) c.set(x0 + 1, r * 4, "h", 0);
      c.set(x1, r * 4 + 2, "e", 0);
    }
  }
});
oAdd("cobble2", (c) => {
  fill(c, "e");
  for (let r = 0; r < 4; r++) {
    const off = r % 2 ? 0 : 4;
    for (let sx = -4 + off; sx < S; sx += 8) {
      const x0 = Math.max(0, sx + 1), x1 = Math.min(S - 1, sx + 6);
      if (x1 < x0) continue;
      c.rect(x0, r * 4, x1 - x0 + 1, 3, hash(sx, r, 4) < 0.5 ? "f" : "g", 0);
      c.rect(x0, r * 4, x1 - x0 + 1, 1, "h", 0);
    }
  }
});
const wave = (c, f, yTop = 0) => {
  for (let y = yTop; y < S; y++) for (let x = 0; x < S; x++) c.set(x, y, y > 11 ? "i" : "j", 0);
  for (let y = yTop; y < S; y++)
    for (let x = 0; x < S; x++) {
      const w = Math.sin(((x + f * 4) / S) * Math.PI * 2 + y * 0.9);
      if (w > 0.72) c.set(x, y, "l", 0);
      else if (w < -0.85) c.set(x, y, "i", 0);
    }
  for (const [x, y] of [[2, 3], [9, 8], [13, 2], [5, 12]]) if ((x + y + f) % 4 === 0 && y >= yTop) c.set(x, y, "m", 0);
};
oAdd("water", (c, f) => wave(c, f), 4, 3);
oAdd("shore", (c, f) => {
  wave(c, f, 6);
  for (let y = 0; y < 5; y++) for (let x = 0; x < S; x++) c.set(x, y, hash(x, y, 8) < 0.2 ? "c" : "b", 0);
  for (let x = 0; x < S; x++) { c.set(x, 5, hash(x, 5, 2) < 0.4 ? "a" : "g", 0); c.set(x, 6, "f", 0); c.set(x, 7, hash(x, 7, 3) < 0.5 ? "e" : "l", 0); }
  speckle(c, 0, 2, S, 3, ["d"], 0.08, 4);
}, 4, 3);
oAdd("dock", (c) => {
  fill(c, "p");
  for (let r = 0; r < 4; r++) {
    c.rect(0, r * 4, S, 1, "q", 0);
    c.rect(0, r * 4 + 3, S, 1, "n", 0);
    c.set(1 + (r % 2) * 7, r * 4 + 1, "n", 0);
    c.set(14 - (r % 2) * 7, r * 4 + 1, "n", 0);
    if (r % 2) c.rect(8, r * 4, 1, 4, "n", 0);
    else c.rect(3, r * 4, 1, 4, "n", 0);
  }
  c.rect(0, 0, 1, S, "o", 0);
  c.rect(S - 1, 0, 1, S, "o", 0);
});
oAdd("tree-top", (c) => {
  c.ellipse(8, 9, 7.4, 7, ["N", "O", "P", "Q"]);
  c.ellipse(5, 6, 3, 2.4, ["O", "P", "Q", "Q"]);
  c.ellipse(11, 12, 3, 2.2, ["N", "N", "O", "O"], { light: [0.5, 0.6, 0.2] });
  for (const [x, y] of [[4, 8], [9, 5], [11, 9], [7, 11]]) c.set(x, y, "Q", 1);
  c.outline("k", null);
});
oAdd("tree-trunk", (c) => {
  c.rect(6, 0, 4, 11, "o");
  c.rect(6, 0, 1, 11, "p");
  c.rect(9, 0, 1, 11, "n");
  c.rect(7, 3, 1, 1, "n");
  c.rect(8, 6, 1, 1, "p");
  c.rect(4, 11, 8, 2, "o");
  c.rect(4, 11, 3, 1, "p");
  c.rect(5, 13, 1, 1, "n");
  c.rect(10, 13, 1, 1, "n");
  c.rect(6, 0, 4, 2, "N");
  c.outline("k", null);
});
oAdd("hedge", (c) => {
  c.rect(0, 4, S, 10, "O", 0);
  for (let x = 0; x < S; x += 4) { c.ellipse(x + 2, 7, 3, 3.4, ["N", "O", "P", "Q"]); c.ellipse(x + 2, 11, 3, 3, ["N", "O", "P", "O"]); }
  c.rect(0, 13, S, 2, "N", 0);
  c.outline("k", null);
});
oAdd("fence", (c) => {
  c.rect(0, 6, S, 2, "q", 0); c.rect(0, 7, S, 1, "o", 0);
  c.rect(0, 10, S, 2, "q", 0); c.rect(0, 11, S, 1, "o", 0);
  for (const x of [1, 11]) { c.rect(x, 3, 3, 11, "p"); c.rect(x, 3, 1, 11, "q"); c.rect(x + 2, 3, 1, 11, "n"); c.set(x + 1, 3, "q", 9); }
  c.outline("k", null);
});
const roof = (c, edge) => {
  fill(c, "x");
  for (let r = 0; r < 4; r++) {
    const off = r % 2 ? 4 : 0;
    for (let sx = -4 + off; sx < S; sx += 8) {
      c.rect(sx, r * 4, 8, 3, "y", 0);
      c.rect(sx, r * 4, 8, 1, "z", 0);
      c.rect(sx, r * 4 + 3, 8, 1, "v", 0);
      c.set(sx, r * 4 + 2, "x", 0); c.set(sx + 7, r * 4 + 2, "x", 0);
    }
  }
  c.rect(0, 14, S, 2, "v", 0);
  if (edge === "l") { c.rect(0, 0, 1, S, "k", 0); c.rect(1, 0, 1, S, "z", 0); }
  if (edge === "r") { c.rect(S - 1, 0, 1, S, "k", 0); c.rect(S - 2, 0, 1, S, "v", 0); }
  c.rect(0, 0, S, 1, "k", 0);
};
oAdd("roof-l", (c) => roof(c, "l"));
oAdd("roof-m", (c) => roof(c, ""));
oAdd("roof-r", (c) => roof(c, "r"));
const wall = (c) => {
  fill(c, "r");
  c.rect(0, 0, S, 2, "s", 0);
  for (let y = 4; y < S; y += 4) c.rect(0, y, S, 1, "t", 0);
  for (let y = 0; y < S; y += 4) for (let x = (y / 4) % 2 ? 4 : 0; x < S; x += 8) c.rect(x, y + 1, 1, 3, "t", 0);
  c.rect(0, 15, S, 1, "u", 0);
  speckle(c, 0, 0, S, S, ["s"], 0.05, 6);
};
oAdd("wall", wall);
oAdd("wall-window", (c) => {
  wall(c);
  c.rect(2, 2, 12, 12, "n", 0);
  c.rect(3, 3, 10, 9, "D", 0);
  c.rect(3, 3, 4, 4, "E", 0);
  c.rect(8, 8, 4, 3, "E", 0);
  for (let i = 0; i < 4; i++) c.set(4 + i, 6 - i, "F", 0);
  c.rect(7, 3, 1, 9, "n", 0); c.rect(3, 7, 10, 1, "n", 0);
  c.rect(1, 13, 14, 2, "q", 0); c.rect(1, 14, 14, 1, "o", 0);
});
oAdd("wall-banner", (c) => {
  wall(c);
  c.rect(3, 0, 10, 1, "n", 0);
  c.rect(4, 1, 8, 13, "x", 0);
  c.rect(4, 1, 8, 1, "z", 0);
  for (let i = 0; i < 4; i++) { c.rect(4, 12 + (i % 2), 2, 2, "x", 0); }
  c.rect(4, 13, 8, 1, "v", 0);
  // a snake coil on the banner (the Python Port crest)
  const sn = [[6, 3], [7, 3], [8, 3], [9, 4], [8, 5], [7, 6], [6, 7], [7, 8], [8, 8], [9, 8], [9, 9], [8, 10]];
  for (const [x, y] of sn) c.set(x, y, "B", 0);
  c.set(9, 3, "B", 0); c.set(10, 3, "A", 0); c.set(9, 2, "k", 0);
  c.set(10, 2, "B", 0);
});
oAdd("wall-sign", (c) => {
  wall(c);
  c.rect(2, 3, 12, 8, "n", 0);
  c.rect(3, 4, 10, 6, "D", 0);
  // "{ }" glyph for the Lab
  for (const [x, y] of [[5, 5], [4, 6], [4, 7], [5, 8], [10, 5], [11, 6], [11, 7], [10, 8]]) c.set(x, y, "z", 0);
  c.set(7, 7, "G", 0); c.set(8, 7, "G", 0);
  c.rect(7, 11, 2, 3, "n", 0);
});
oAdd("door", (c) => {
  wall(c);
  c.rect(3, 1, 10, 15, "k", 0);
  c.rect(4, 2, 8, 14, "o", 0);
  c.ellipse(8, 4, 4, 3, ["o", "o", "p", "p"], { part: 3 });
  c.rect(4, 5, 8, 11, "o", 0);
  c.rect(4, 5, 1, 11, "p", 0); c.rect(11, 5, 1, 11, "n", 0);
  c.rect(7, 2, 2, 14, "n", 0);
  c.rect(5, 8, 1, 6, "p", 0); c.rect(9, 8, 1, 6, "p", 0);
  c.set(6, 10, "G", 0); c.set(9, 10, "G", 0);
  c.rect(2, 14, 12, 2, "g", 0); c.rect(2, 15, 12, 1, "f", 0);
});
const lampPost = (c) => { c.rect(7, 0, 2, 16, "I", 0); c.rect(7, 0, 1, 16, "J", 0); };
oAdd("lamp-top", (c, f) => {
  c.rect(7, 7, 2, 9, "I"); c.rect(7, 7, 1, 9, "J");
  c.rect(4, 3, 8, 5, f ? "H" : "G");
  c.rect(5, 4, 6, 3, f ? "w" : "H");
  c.rect(3, 2, 10, 1, "I"); c.rect(5, 1, 6, 1, "I"); c.rect(7, 0, 2, 1, "J");
  c.rect(3, 8, 10, 1, "I");
  c.outline("k", null);
}, 2, 3);
oAdd("lamp-bottom", (c) => { lampPost(c); c.rect(5, 13, 6, 3, "I", 0); c.rect(5, 13, 6, 1, "J", 0); c.outline("k", null); });
oAdd("crate", (c) => {
  c.rect(1, 2, 14, 13, "p");
  c.rect(1, 2, 14, 2, "q"); c.rect(1, 13, 14, 2, "n");
  c.rect(1, 2, 2, 13, "o"); c.rect(13, 2, 2, 13, "o");
  c.line(3, 4, 12, 12, "o"); c.line(12, 4, 3, 12, "o");
  c.outline("k", null);
});
oAdd("barrel", (c) => {
  c.ellipse(8, 8, 6, 7.2, ["n", "o", "p", "q"]);
  c.rect(2, 4, 12, 1, "I", 9); c.rect(2, 11, 12, 1, "I", 9);
  c.outline("k", null);
});
oAdd("signpost", (c) => {
  c.rect(7, 6, 2, 10, "o"); c.rect(7, 6, 1, 10, "p");
  c.rect(2, 1, 12, 7, "q"); c.rect(2, 1, 12, 1, "h"); c.rect(2, 7, 12, 1, "o");
  for (const [x, y] of [[5, 3], [4, 4], [5, 5], [10, 3], [11, 4], [10, 5]]) c.set(x, y, "n", 9);
  c.outline("k", null);
});
oAdd("bench", (c) => {
  c.rect(1, 5, 14, 3, "q"); c.rect(1, 5, 14, 1, "h"); c.rect(1, 7, 14, 1, "o");
  c.rect(1, 8, 2, 6, "n"); c.rect(13, 8, 2, 6, "n");
  c.rect(1, 2, 14, 2, "p"); c.rect(1, 3, 14, 1, "o");
  c.outline("k", null);
});

// -------------------------------------------------------------------- lab
const labPal = {
  k: "#150f26", w: "#ffffff",
  a: "#aab2c8", b: "#c0c7da", c: "#d8deee", d: "#eef1f8", // floor
  e: "#1d2147", f: "#2b3066", g: "#3d4590", h: "#5b66c0", // wall
  i: "#4a2f1d", j: "#6e4528", l: "#94602f", m: "#b98348", // wood
  n: "#3a3f58", o: "#5b6180", p: "#8a90ad", q: "#bcc2da", // metal
  r: "#0a2a30", s: "#14e0c8", t: "#8cfff0", u: "#ffd84a", v: "#ff6b8a", // screen, LEDs
  x: "#0f1840", y: "#1f2f78", z: "#fff6c8", // night sky
  A: "#1f5a35", B: "#2f8a4a", C: "#55b866", D: "#b3405f", E: "#7a2840", // plant and pot
  F: "#7b3fa8", G: "#a56cd6", H: "#d9b5f0", // rug
  I: "#f2f4fa", J: "#cfd4e6", K: "#e8567e", L: "#22b0b8", M: "#1a1236", // whiteboard
  N: "#14808c", O: "#6fe0dc", P: "#b8fffa", Q: "#ffe27a", R: "#6a4a30", // capsule, books
  S: "#3a6ac8", T: "#c8643a", U: "#58a05a", // book colours
};
const labTiles = new Map();
const lAdd = (n, d, f, p) => add(labTiles, n, d, f, p);
const floor = (c, alt) => {
  fill(c, alt ? "b" : "c");
  c.rect(0, 0, S, 1, alt ? "c" : "d", 0);
  c.rect(0, 0, 1, S, alt ? "c" : "d", 0);
  c.rect(0, 15, S, 1, "a", 0);
  c.rect(15, 0, 1, S, "a", 0);
  speckle(c, 1, 1, 14, 14, [alt ? "a" : "b"], 0.04, alt ? 2 : 7);
};
lAdd("floor", (c) => floor(c, false));
lAdd("floor2", (c) => floor(c, true));
lAdd("wall-top", (c) => {
  fill(c, "e");
  c.rect(0, 12, S, 4, "f", 0);
  c.rect(0, 12, S, 1, "g", 0);
  speckle(c, 0, 0, S, 12, ["f"], 0.08, 3);
});
lAdd("wall-face", (c) => {
  fill(c, "g");
  c.rect(0, 0, S, 2, "h", 0);
  c.rect(0, 12, S, 4, "f", 0);
  c.rect(0, 12, S, 1, "e", 0);
  c.rect(0, 8, S, 1, "f", 0);
  c.rect(0, 15, S, 1, "e", 0);
  for (const x of [0, 15]) c.rect(x, 2, 1, 10, "f", 0);
});
lAdd("window", (c, f) => {
  c.rect(0, 0, S, S, "g", 0);
  c.rect(1, 1, 14, 12, "q", 0);
  c.rect(2, 2, 12, 10, "x", 0);
  c.rect(2, 7, 12, 5, "y", 0);
  c.rect(7, 2, 2, 10, "q", 0); c.rect(2, 7, 12, 1, "q", 0);
  const stars = f ? [[3, 3], [11, 4], [5, 9], [12, 10]] : [[4, 4], [10, 3], [4, 10], [11, 9]];
  for (const [x, y] of stars) c.set(x, y, "z", 0);
  c.rect(0, 14, S, 2, "f", 0);
  c.rect(0, 13, S, 1, "p", 0);
}, 2, 1);
lAdd("shelf-top", (c) => {
  c.rect(0, 0, S, S, "j", 0);
  c.rect(0, 0, S, 1, "m", 0); c.rect(0, 0, 1, S, "l", 0); c.rect(15, 0, 1, S, "i", 0);
  c.rect(2, 2, 12, 12, "i", 0);
  const cols = ["S", "T", "U", "D", "u", "S"];
  const booksRow = (y0, seed) => { let x = 3; for (let i = 0; x < 13; i++) { const bw = 1 + Math.floor(hash(i, y0, seed) * 2.99); const bh = 5 + Math.floor(hash(i, y0, seed + 1) * 3); for (let xx = x; xx < Math.min(13, x + bw); xx++) c.rect(xx, y0 + 6 - bh, 1, bh, cols[(i + seed) % 6], 0); c.set(x, y0 + 6 - bh, "w", 0); x += bw + (hash(i, y0, 9) < 0.2 ? 1 : 0); } c.rect(2, y0 + 6, 12, 1, "l", 0); };
  booksRow(2, 1); booksRow(8, 4);
});
lAdd("shelf-bottom", (c) => {
  c.rect(0, 0, S, S, "j", 0);
  c.rect(0, 0, 1, S, "l", 0); c.rect(15, 0, 1, S, "i", 0);
  c.rect(2, 0, 12, 7, "i", 0);
  c.rect(2, 6, 12, 1, "l", 0);
  c.rect(0, 7, S, 9, "j", 0);
  c.rect(1, 8, 14, 7, "l", 0); c.rect(1, 8, 14, 1, "m", 0);
  c.rect(6, 10, 4, 1, "u", 0); c.rect(6, 11, 4, 1, "i", 0);
  c.rect(0, 15, S, 1, "i", 0);
  let x = 3; for (let i = 0; x < 13; i++) { const bw = 1 + (i % 2); for (let xx = x; xx < x + bw; xx++) c.rect(xx, 1, 1, 5 - (i % 3 === 0 ? 1 : 0) , ["T", "S", "U"][i % 3], 0); x += bw; }
});
const desk = (c, kind) => {
  c.rect(0, 0, S, 6, "m", 0);
  c.rect(0, 0, S, 1, "w", 0); c.rect(0, 1, S, 1, "m", 0);
  c.rect(0, 5, S, 1, "l", 0);
  c.rect(0, 6, S, 9, "j", 0);
  c.rect(0, 6, S, 1, "i", 0);
  c.rect(0, 15, S, 1, "i", 0);
  if (kind !== "m") { c.rect(kind === "l" ? 0 : 14, 0, 2, 16, "i", 0); }
  if (kind === "m") { c.rect(3, 8, 10, 5, "l", 0); c.rect(3, 8, 10, 1, "m", 0); c.rect(7, 10, 2, 1, "u", 0); }
};
lAdd("desk-l", (c) => desk(c, "l"));
lAdd("desk-m", (c) => desk(c, "m"));
lAdd("desk-r", (c) => desk(c, "r"));
lAdd("monitor", (c, f) => {
  c.rect(2, 1, 12, 10, "n");
  c.rect(3, 2, 10, 7, "r", 8);
  const lines = [[1, 5], [3, 7], [3, 4], [1, 6], [2, 8]];
  lines.forEach(([ind, len], i) => {
    const y = 3 + ((i + f) % 5) + 0;
    if (y <= 7) c.rect(4 + ind - 1, y, Math.min(len, 8 - ind), 1, i % 3 === 0 ? "u" : "s", 9);
  });
  c.set(4, 8, "t", 9);
  c.rect(6, 11, 4, 2, "o"); c.rect(4, 13, 8, 1, "p");
  c.outline("k", null);
}, 3, 3);
lAdd("rack-top", (c, f) => {
  c.rect(1, 1, 14, 15, "n");
  c.rect(1, 1, 14, 1, "p"); c.rect(1, 1, 1, 15, "o");
  for (let i = 0; i < 3; i++) {
    c.rect(3, 3 + i * 4, 10, 3, "o", 5 + i); c.rect(3, 3 + i * 4, 10, 1, "p", 5 + i);
    c.rect(4, 5 + i * 4, 4, 1, "n", 8 + i);
    c.set(10, 4 + i * 4, (f + i) % 3 === 0 ? "v" : "s", 20 + i); c.set(12, 4 + i * 4, (f + i) % 2 ? "u" : "s", 20 + i);
  }
  c.outline("k", null);
}, 3, 4);
lAdd("rack-bottom", (c, f) => {
  c.rect(1, 0, 14, 14, "n");
  c.rect(1, 0, 1, 14, "o");
  for (let i = 0; i < 2; i++) { c.rect(3, 1 + i * 4, 10, 3, "o", 5 + i); c.rect(3, 1 + i * 4, 10, 1, "p", 5 + i); c.set(10, 2 + i * 4, (f + i) % 3 === 1 ? "v" : "s", 20); c.set(12, 2 + i * 4, "s", 20); }
  c.rect(5, 9, 6, 3, "r", 7); c.rect(6, 10, 4, 1, "s", 8);
  c.rect(2, 14, 3, 2, "n"); c.rect(11, 14, 3, 2, "n");
  c.outline("k", null);
}, 3, 4);
const boardPair = (side, f) => {
  const c = new Canvas(32, 16);
  c.rect(0, 1, 32, 14, "p", 0);
  c.rect(1, 2, 30, 11, "I", 0);
  c.rect(1, 12, 30, 1, "J", 0);
  c.rect(0, 14, 32, 2, "o", 0);
  for (const [x, y, w] of [[4, 4, 6], [4, 8, 6]]) c.rect(x, y, w, 1, "M", 0);
  // a 2-input perceptron: x1, x2 -> sum -> out
  const node = (x, y, ch) => { c.disc(x, y, 2, 2, "M"); c.disc(x, y, 1, 1, ch); };
  const lineP = (x0, y0, x1, y1, ch) => c.line(x0, y0, x1, y1, ch, 0);
  lineP(11, 5, 19, 8, "L"); lineP(11, 10, 19, 8, "K");
  lineP(21, 8, 26, 8, "M");
  node(10, 5, "L"); node(10, 10, "L"); node(20, 8, "K");
  c.rect(26, 7, 3, 3, "M", 0); c.rect(27, 8, 1, 1, f ? "u" : "I", 0);
  c.rect(4, 11, 2, 1, "M", 0);
  const rows = c.rows().map((r) => (side === "l" ? r.slice(0, 16) : r.slice(16)));
  return rows;
};
for (const side of ["l", "r"]) {
  const fr = (side === "l" ? [0] : [0, 1]).map((f) => boardPair(side, f));
  labTiles.set(`board-${side}`, side === "l" ? { frames: fr } : { frames: fr, fps: 1 });
}
lAdd("plant", (c, f) => {
  c.rect(4, 10, 8, 6, "D"); c.rect(4, 10, 8, 1, "w"); c.rect(5, 15, 6, 1, "E"); c.rect(4, 12, 2, 3, "E");
  c.line(8, 10, 8, 4, "B", 0);
  const sway = f ? 1 : 0;
  c.ellipse(4 + sway, 6, 3.4, 2, ["A", "B", "C", "C"], { angle: -0.6 });
  c.ellipse(12 - sway, 6, 3.4, 2, ["A", "B", "C", "C"], { angle: 0.6 });
  c.ellipse(8, 3, 2.2, 3.2, ["A", "B", "C", "C"]);
  c.ellipse(5, 10, 3, 1.6, ["A", "B", "B", "C"], { angle: 0.3 });
  c.ellipse(11, 10, 3, 1.6, ["A", "B", "B", "C"], { angle: -0.3 });
  c.outline("k", null);
}, 2, 1.5);
const rug = (c, e) => {
  c.rect(0, 2, S, 12, "F", 0);
  c.rect(0, 2, S, 1, "H", 0); c.rect(0, 13, S, 1, "F", 0);
  c.rect(0, 3, S, 1, "G", 0); c.rect(0, 12, S, 1, "G", 0);
  for (let x = 2; x < S; x += 4) { c.set(x, 7, "H", 0); c.set(x + 1, 8, "H", 0); c.set(x, 8, "G", 0); c.set(x + 1, 7, "G", 0); }
  if (e === "l") { c.rect(0, 2, 1, 12, "G", 0); for (let y = 3; y < 13; y += 2) c.set(0, y, "H", 0); }
  if (e === "r") { c.rect(S - 1, 2, 1, 12, "G", 0); for (let y = 3; y < 13; y += 2) c.set(S - 1, y, "H", 0); }
};
lAdd("rug-l", (c) => rug(c, "l"));
lAdd("rug-m", (c) => rug(c, ""));
lAdd("rug-r", (c) => rug(c, "r"));
lAdd("chair", (c) => {
  c.rect(3, 1, 10, 8, "D"); c.rect(3, 1, 10, 2, "v"); c.rect(3, 1, 1, 8, "E");
  c.rect(4, 9, 8, 3, "E"); c.rect(4, 9, 8, 1, "D");
  c.rect(7, 12, 2, 2, "n"); c.rect(4, 14, 8, 1, "o");
  c.outline("k", null);
});
lAdd("mat", (c) => {
  floor(c, false);
  c.rect(2, 3, 12, 10, "E", 0); c.rect(3, 4, 10, 8, "D", 0);
  for (let x = 4; x < 12; x += 2) c.set(x, 7, "w", 0);
  c.rect(4, 8, 8, 1, "E", 0);
});
lAdd("capsule-top", (c, f) => {
  c.ellipse(8, 9, 6, 7, ["N", "O", "O", "P"], { light: [-0.3, -0.7, 0.4] });
  c.rect(3, 12, 10, 4, "O");
  const g = [[0, 0], [1, -1], [0, -2]][f];
  c.disc(8 + g[0], 11 + g[1], 1.5, 1.5, "Q"); c.disc(8 + g[0], 11 + g[1], 0.7, 0.7, "w");
  c.set(5, 5, "w", 9); c.set(5, 6, "w", 9); c.set(6, 4, "P", 9);
  c.outline("k", null);
}, 3, 3);
lAdd("capsule-bottom", (c, f) => {
  c.rect(3, 0, 10, 3, "O"); c.rect(3, 0, 10, 1, "P");
  c.rect(2, 3, 12, 7, "n"); c.rect(2, 3, 12, 1, "p"); c.rect(2, 3, 1, 7, "o");
  c.rect(5, 5, 6, 2, "r", 7); c.set(6 + f, 6, "s", 8);
  c.set(4, 8, "v", 9); c.set(11, 8, "u", 9);
  c.rect(1, 10, 14, 5, "o"); c.rect(1, 10, 14, 1, "q"); c.rect(1, 14, 14, 1, "n");
  c.outline("k", null);
}, 3, 3);

// ---------------------------------------------------------------- output
function toModule({ exportName, id, name, doc, palette, tiles }) {
  const pal = Object.entries(palette).map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(",\n");
  const body = [...tiles.entries()]
    .map(([n, { frames, fps }]) => `    ${JSON.stringify(n)}: {${fps ? ` fps: ${fps},` : ""} frames: [\n${frames.map((f) => `      [\n${f.map((r) => `        "${r}"`).join(",\n")},\n      ]`).join(",\n")},\n    ] }`)
    .join(",\n");
  return `// Generated by scripts/art/tiles.mjs, then committed. Edit freely.
import type { TileSetDef } from "./tileset";

/** ${doc} */
export const ${exportName}: TileSetDef = {
  id: ${JSON.stringify(id)},
  name: ${JSON.stringify(name)},
  tile: ${S},
  palette: {
${pal},
  },
  tiles: {
${body},
  },
};
`;
}
writeFileSync("game/tiles/python-port.ts", toModule({ exportName: "PYTHON_PORT_TILES", id: "python-port", name: "Python Port", doc: "Python Port outdoor tileset, 16×16: grass, cobbles, water, dock, trees, teal-roofed houses, lamps and props.", palette: outPal, tiles: outTiles }));
writeFileSync("game/tiles/lab-interior.ts", toModule({ exportName: "LAB_INTERIOR_TILES", id: "lab-interior", name: "Lab interior", doc: "Professor Okafor's Lab tileset, 16×16: floor, walls, shelves, desks, monitors, servers, whiteboard and the incubator capsule.", palette: labPal, tiles: labTiles }));
console.log(`wrote ${outTiles.size} outdoor and ${labTiles.size} lab tiles`);
