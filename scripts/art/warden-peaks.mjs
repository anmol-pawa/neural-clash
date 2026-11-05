// Generates game/sprites/creatures/warden-peaks.ts
// Warden Mean, the Probability Peaks guardian: a glacier golem whose body is a bell
// curve built from nine stacked ice bars (a histogram). A magenta line marks the mean
// down the tallest bar. Its head is a floating die whose two pips are the eyes, and its
// fists are small dice. When it attacks it "rolls" them. Original design, 96x96.
import { writeFileSync } from "node:fs";
import { Canvas, toModule } from "./raster.mjs";

const W = 96, H = 96;
const palette = {
  k: "#10142a", i: "#2a3260",
  a: "#2a5a9a", b: "#4a8ad0", c: "#8ac8f0", d: "#e2f8ff", // ice ramp
  p: "#3a3a6a", q: "#5a5a9a", r: "#8a8ac8", s: "#c4c4ec", // slate ramp (floe)
  v: "#8c90b8", w: "#b8bcd8", x: "#e4e8f8", y: "#ffffff", // die ramp
  z: "#ff5adc", m: "#a02a8a", // mean marker
  e: "#10142a", g: "#6ad0ec", f: "#ff4f6d", o: "#ffd27a",
};
const ICE = ["a", "b", "c", "d"];
const SLATE = ["p", "q", "r", "s"];
const FLASH = ["w", "x", "y", "y"];
const SKIP = new Set(["z", "m", "g", "o"]);
const base = { dy: 0, breathe: 0, eye: "open", flash: 0, lift: 0, fistR: 0, fistL: 0, roll: 0, collapse: 0, shards: 0, tilt: 0 };

const X0 = 21, BARW = 5, STEP = 6, BASE = 82;
const HEIGHTS = [10, 18, 29, 39, 46, 39, 29, 18, 10]; // an actual bell shape, mean at bar 4

function bar(c, i, hgt, ramp) {
  const x = X0 + i * STEP, top = BASE - hgt, part = c.nextPart();
  for (let y = top; y < BASE; y++) {
    for (let dx = 0; dx < BARW; dx++) {
      let lvl = dx === 0 ? 3 : dx === 1 ? 2 : dx === 2 ? 2 : dx === 3 ? 1 : 0;
      if (y === top) lvl = 3;
      else if (y === top + 1) lvl = Math.min(3, lvl + 1);
      c.set(x + dx, y, ramp[lvl], part);
    }
    if ((BASE - y) % 9 === 0 && y > top + 2) c.rect(x, y, BARW, 1, ramp[0], -1); // ice-block seams
  }
  if (hgt > 14) c.set(x + 1, top + 3, ramp[3], -1); // glint
}

function pipDie(c, cx, cy, size, face, ramp = ["v", "w", "x", "y"]) {
  // front face with pips for a given count (1..6), used by fists and thrown dice
  const part = c.nextPart();
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const lvl = x === 0 || y === 0 ? 3 : x === size - 1 || y === size - 1 ? 1 : 2;
    c.set(cx + x, cy + y, ramp[lvl], part);
  }
  const m = size / 2, q = Math.max(1, Math.floor(size / 4));
  const spots = {
    1: [[m, m]], 2: [[q + 1, q + 1], [size - q - 1, size - q - 1]],
    3: [[q + 1, q + 1], [m, m], [size - q - 1, size - q - 1]],
    4: [[q + 1, q + 1], [size - q - 1, q + 1], [q + 1, size - q - 1], [size - q - 1, size - q - 1]],
    5: [[q + 1, q + 1], [size - q - 1, q + 1], [m, m], [q + 1, size - q - 1], [size - q - 1, size - q - 1]],
    6: [[q + 1, q + 1], [size - q - 1, q + 1], [q + 1, m], [size - q - 1, m], [q + 1, size - q - 1], [size - q - 1, size - q - 1]],
  }[face];
  for (const [px, py] of spots) c.set(cx + Math.floor(px), cy + Math.floor(py), "e", -1);
}

function draw(p) {
  const c = new Canvas(W, H);
  const cx = X0 + 4 * STEP + 2; // centre of the tallest bar = 47
  // ice floe
  c.ellipse(cx, 88 + p.dy * 0.2, 36, 6, SLATE);
  c.ellipse(cx, 85 + p.dy * 0.2, 31, 4, SLATE, { bias: 0.15 });

  // the bell: nine ice bars; "breathe" re-samples the histogram a little
  const ramp = p.flash ? FLASH : ICE;
  for (let i = 0; i < 9; i++) {
    const wob = p.breathe ? (i % 2 ? p.breathe : -p.breathe) : 0;
    const h = Math.max(3, Math.round((HEIGHTS[i] + wob) * (1 - p.collapse)));
    bar(c, i, h, ramp);
  }
  const midTop = BASE - Math.max(3, Math.round(HEIGHTS[4] * (1 - p.collapse)));
  // mean marker: a magenta line through the tallest bar, with sigma ticks beside it
  c.rect(cx, midTop + 3, 1, BASE - midTop - 3, "z", -1);
  for (let y = midTop + 8; y < BASE - 2; y += 8) c.rect(cx - 1, y, 3, 1, "m", -1);

  // floating die head
  const hs = 18;
  const hx = cx - 9 + p.tilt, hy = midTop - 24 + p.dy - p.lift + Math.round(p.collapse * 8);
  const part = c.nextPart();
  for (let y = 0; y < hs; y++) for (let x = 0; x < hs; x++) {
    const lvl = x < 2 || y < 2 ? 3 : x > hs - 3 || y > hs - 3 ? 1 : 2;
    c.set(hx + x, hy + y, ["v", "w", "x", "y"][lvl], part);
  }
  // top face and right face for a cube read
  const top = c.nextPart(), side = c.nextPart();
  for (let j = 1; j <= 4; j++) c.rect(hx + j, hy - j, hs, 1, j === 4 ? "y" : "x", top);
  for (let j = 1; j <= 4; j++) for (let y = 0; y < hs; y++) c.set(hx + hs - 1 + j, hy - j + y, y > hs - 3 ? "v" : "w", side);
  c.set(hx + 7, hy - 2, "e", -1); c.set(hx + 11, hy - 3, "e", -1); // pips on the top face
  // eyes are the two pips of the "2" face
  const ex = [hx + 4, hx + hs - 8], ey = hy + 4;
  if (p.eye === "dead") {
    for (const x of ex) { c.line(x, ey, x + 3, ey + 3, "f"); c.line(x, ey + 3, x + 3, ey, "f"); }
  } else if (p.eye === "blink") {
    for (const x of ex) c.rect(x, ey + 2, 4, 1, "e");
  } else {
    const col = p.eye === "hurt" ? "f" : "e";
    for (const x of ex) { c.rect(x, ey, 4, 4, col); c.set(x + 1, ey + 1, "g"); }
  }
  c.rect(hx + 6, hy + 12, 6, 1, "e", -1); // mouth line
  if (p.eye === "hurt") c.rect(hx + 5, hy + 13, 8, 1, "e", -1);

  // fists: small dice hovering beside the shoulders, tied to the bell by dotted links
  const ly = 44 - p.fistL + p.dy, lx = 9;
  const rx = 76 + Math.round(p.fistR * 9), ry = 44 - Math.round(p.fistR * 6) + p.dy;
  for (let k = 0; k < 4; k++) { c.set(lx + 9 + k * 3, ly + 9 + k * 2, "r", -1); c.set(rx - 3 - k * 3 + (p.fistR ? -k : 0), ry + 9 + k * 2 - (p.fistR ? k : 0), "r", -1); }
  pipDie(c, lx, ly, 10, p.roll ? 5 : 3);
  pipDie(c, Math.min(rx, 84), ry, 10, p.roll ? 6 : 4);

  // attack: the thrown die tumbles out with scattered pips
  if (p.roll) {
    const sx = Math.min(rx, 84) + 5, sy = ry + 5;
    for (let k = 0; k < p.roll; k++) {
      const px = Math.min(88, sx + 2 + k * 2), py = sy - 4 + k * 5;
      c.disc(px, py, 2, 2, k % 2 ? "o" : "g");
    }
  }
  if (p.shards) for (const [x, y] of [[12, 74], [82, 70], [24, 62], [70, 60]]) c.rect(x, y - p.shards * 3, 3, 3, "c");

  c.outline("k", "i", SKIP);
  return c.rows();
}

const P = (o) => ({ ...base, ...o });
const anims = {
  idle: [P({}), P({ breathe: 2, dy: -1, fistL: 1 }), P({ breathe: 0, dy: -2, fistR: 0, fistL: 2 }), P({ breathe: -2, dy: -1, eye: "blink", fistL: 1 })].map(draw),
  attack: [
    P({ lift: 3, dy: 2, fistR: -0.6, tilt: -1 }),
    P({ fistR: 1, roll: 1, lift: -1 }),
    P({ fistR: 1.4, roll: 2, flash: 1 }),
    P({ fistR: 1.6, roll: 3, flash: 1, tilt: 1 }),
    P({ fistR: 0.3 }),
  ].map(draw),
  hurt: [P({ dy: 1, eye: "hurt", flash: 1, tilt: -2 }), P({ eye: "hurt", tilt: 2, breathe: 1 }), P({ dy: 2, eye: "hurt" })].map(draw),
  faint: [P({ dy: 2, eye: "hurt", collapse: 0.15 }), P({ dy: 5, eye: "dead", collapse: 0.4, shards: 1 }), P({ dy: 8, eye: "dead", collapse: 0.65, shards: 2 }), P({ dy: 10, eye: "dead", collapse: 0.85, shards: 3 })].map(draw),
};

writeFileSync("game/sprites/creatures/warden-peaks.ts", toModule({
  id: "warden-peaks", name: "WARDEN MEAN", exportName: "WARDEN_PEAKS", w: W, h: H, palette,
  doc: "Warden Mean, the Probability Peaks guardian. Front view, 96×96. A glacier golem whose body is a bell curve of nine stacked ice bars with a magenta mean line; its head is a floating die whose two pips are the eyes, and its fists are small dice it rolls when attacking.",
  fps: { idle: 4, attack: 7, hurt: 8, faint: 4 }, anims, generator: "scripts/art/warden-peaks.mjs",
}));
console.log("wrote warden-peaks");
