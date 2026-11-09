// Generates game/sprites/creatures/warden-bell.ts
// Warden Bell, the Probability Peaks guardian: an ice golem whose torso is a
// histogram of frosted bars rising into a bell curve (the central limit theorem),
// a magenta mean marker down its middle, a die for a head (pips = randomness),
// and arms that hold a pair of dice. Original design, 96x96.
import { writeFileSync } from "node:fs";
import { Canvas, toModule } from "./raster.mjs";

const W = 96, H = 96;
const palette = {
  k: "#0f1630", i: "#1e2a52",
  a: "#2c4478", b: "#4a72b0", c: "#8cc0e8", d: "#dff4ff", // ice ramp
  p: "#3a2a60", q: "#5e4aa0", r: "#8e7ad8", s: "#c8bcff", // indigo ramp
  t: "#2ee6c8", u: "#a8fff0", // teal bell curve
  m: "#ff4fd8", n: "#ffc2f2", // mean marker
  e: "#101020", w: "#ffffff", x: "#ff4f6d", g: "#f4fbff",
};
const ICE = ["a", "b", "c", "d"];
const IND = ["p", "q", "r", "s"];
const SKIP = new Set(["t", "u", "m", "n", "g"]);
const base = { dy: 0, squash: 0, arm: 0, eye: "open", pulse: 0, flash: 0, bob: 0, shards: 0, spread: 0 };

function die(c, x, y, s, face) {
  c.rect(x, y, s, s, "g", -1);
  c.rect(x, y, s, 1, "d", -1); c.rect(x, y + s - 1, s, 1, "c", -1);
  c.rect(x, y, 1, s, "d", -1); c.rect(x + s - 1, y, 1, s, "c", -1);
  const pips = { 1: [[.5, .5]], 2: [[.28, .28], [.72, .72]], 3: [[.28, .28], [.5, .5], [.72, .72]], 5: [[.28, .28], [.72, .28], [.5, .5], [.28, .72], [.72, .72]], 6: [[.28, .25], [.72, .25], [.28, .5], [.72, .5], [.28, .75], [.72, .75]] }[face];
  for (const [u, v] of pips) c.set(x + Math.round(u * (s - 1)), y + Math.round(v * (s - 1)), "p", -1);
}
function draw(p) {
  const c = new Canvas(W, H);
  const dy = p.dy, sq = p.squash;
  const cx = 47, by = 80 + dy;

  // floating ice floe
  c.ellipse(cx, 87 + dy * 0.3, 30, 6, ICE);
  c.ellipse(cx, 84 + dy * 0.3, 24, 4, ICE, { bias: 0.1 });

  // arms: indigo, each holding a die
  const shY = by - 30 + sq, ext = p.arm;
  for (const sg of [-1, 1]) {
    const ex = cx + sg * (33 + (sg > 0 ? ext * 8 : 1)), ey = shY + 12 - (sg > 0 ? ext * 8 : 0) + (sg > 0 ? p.bob : -p.bob);
    c.ellipse(cx + sg * 29, shY, 7, 6, IND);
    c.ellipse((cx + sg * 31 + ex) / 2, (shY + ey) / 2 + 3, 5, 9, IND, { angle: sg * 0.25 });
    die(c, Math.round(ex - 5), Math.round(ey + 6), 11, sg > 0 ? 6 : 5);
  }

  // torso: histogram bars forming a bell. 13 columns, heights follow a Gaussian.
  const bars = 13, bw = 4, baseY = by;
  const tallest = 42 - sq;
  const mid = (bars - 1) / 2;
  for (let i = 0; i < bars; i++) {
    const z = (i - mid) / 3.2;
    const wob = p.spread ? Math.round(Math.sin(i * 1.7 + p.spread) * 2) : 0;
    const h = Math.max(8, Math.round(tallest * Math.exp(-z * z / 2)) + wob);
    const x0 = cx - Math.round((bars * bw) / 2) + i * bw;
    const part = c.nextPart();
    for (let y = baseY - h; y < baseY; y++) for (let x = 0; x < bw; x++) {
      const v = (y - (baseY - h)) / h;
      let lvl = x === 0 ? 3 : x === bw - 1 ? 0 : 1 + (v < 0.5 ? 1 : 0);
      if (y === baseY - h) lvl = 3;
      c.set(x0 + x, y, ICE[Math.min(3, lvl)], part);
    }
  }
  // teal bell curve traced over the bar tops, with a sparkle that travels (pulse)
  const pts = [];
  for (let i = 0; i < bars * bw; i++) {
    const z = (i - (bars * bw) / 2) / (bw * 3.2);
    pts.push([cx - Math.round((bars * bw) / 2) + i, baseY - Math.round(tallest * Math.exp(-z * z / 2)) - 2]);
  }
  pts.forEach(([x, y], i) => c.set(x, y, Math.abs(i - p.pulse * 6) < 2 ? "u" : "t", -1));
  // magenta mean marker down the middle
  for (let y = baseY - tallest - 6; y < baseY; y += 2) c.set(cx, y, "m", -1);
  c.rect(cx - 1, baseY - tallest - 8, 3, 2, "n", -1);

  // head: a die with a face plate
  const hx = cx, hy = baseY - tallest - 12 + (sq ? sq * 0.3 : 0);
  c.rect(hx - 12, hy - 11, 24, 22, "c"); c.rect(hx - 12, hy - 11, 24, 3, "d", -1);
  c.rect(hx - 12, hy + 8, 24, 3, "b", -1); c.rect(hx + 9, hy - 11, 3, 22, "b", -1);
  // corner pips
  for (const [ox, oy] of [[-8, -7], [8, -7]]) c.disc(hx + ox, hy + oy, 1.4, 1.4, "p", -1);
  if (p.eye === "dead") {
    for (const sg of [-1, 1]) { c.line(hx + sg * 5 - 2, hy - 1, hx + sg * 5 + 2, hy + 3, "x"); c.line(hx + sg * 5 - 2, hy + 3, hx + sg * 5 + 2, hy - 1, "x"); }
  } else if (p.eye === "blink") {
    c.rect(hx - 8, hy + 1, 6, 1, "k"); c.rect(hx + 3, hy + 1, 6, 1, "k");
  } else {
    const col = p.eye === "hurt" ? "x" : "t";
    c.rect(hx - 8, hy - 2, 6, 5, "e"); c.rect(hx + 3, hy - 2, 6, 5, "e");
    c.rect(hx - 7, hy - 1, 3, 3, col); c.rect(hx + 4, hy - 1, 3, 3, col);
    c.set(hx - 7, hy - 1, "w"); c.set(hx + 4, hy - 1, "w");
  }
  c.rect(hx - 4, hy + 6, 9, 1, "k", -1);

  // attack: dice tumble out from the right hand
  if (p.roll) {
    const sx = cx + 41 + ext * 8, sy = shY + 16 - ext * 8;
    for (let k = 0; k < p.roll; k++) die(c, Math.min(sx + 6 + k * 8, 84), sy - 6 + (k % 2) * 8 - k * 2, 7, [3, 5, 6][k % 3]);
  }
  if (p.shards) for (const [x, y] of [[12, 70], [80, 66], [20, 54], [74, 52]]) c.rect(x, y - p.shards * 3, 3, 3, "d");
  if (p.flash) for (const [x, y] of [[10, 30], [84, 28]]) { c.rect(x - 2, y, 5, 1, "w", -1); c.rect(x, y - 2, 1, 5, "w", -1); }

  c.outline("k", "i", SKIP);
  return c.rows();
}

const P = (o) => ({ ...base, ...o });
const anims = {
  idle: [P({ pulse: 0 }), P({ pulse: 1, dy: -1, bob: 1 }), P({ pulse: 2, dy: -2 }), P({ pulse: 1, dy: -1, bob: 1, eye: "blink" })].map(draw),
  attack: [
    P({ arm: -1, squash: 3, dy: 2 }),
    P({ arm: 1, roll: 1 }),
    P({ arm: 1, roll: 2, flash: 1 }),
    P({ arm: 1, roll: 3, flash: 1 }),
    P({ arm: 0, pulse: 3 }),
  ].map(draw),
  hurt: [P({ dy: 1, eye: "hurt", flash: 1, spread: 1 }), P({ eye: "hurt", spread: 3 }), P({ dy: 2, eye: "hurt" })].map(draw),
  faint: [P({ dy: 3, squash: 4, eye: "hurt" }), P({ dy: 8, squash: 10, eye: "dead", shards: 1, spread: 2 }), P({ dy: 12, squash: 16, eye: "dead", shards: 2, spread: 4 }), P({ dy: 14, squash: 20, eye: "dead", shards: 3, spread: 6 })].map(draw),
};

writeFileSync("game/sprites/creatures/warden-bell.ts", toModule({
  id: "warden-bell", name: "WARDEN BELL", exportName: "WARDEN_BELL", w: W, h: H, palette,
  doc: "Warden Bell, the Probability Peaks guardian. Front view, 96×96. An ice golem whose torso is a histogram rising into a bell curve with a magenta mean marker; a die is its head and it hurls dice.",
  fps: { idle: 4, attack: 7, hurt: 8, faint: 4 }, anims, generator: "scripts/art/warden-bell.mjs",
}));
console.log("wrote warden-bell");
