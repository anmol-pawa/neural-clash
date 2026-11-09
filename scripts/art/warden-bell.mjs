// Generates game/sprites/creatures/warden-bell.ts
// Warden Bell, the Probability Peaks guardian: a glacier-ice golem whose whole body is a
// bell curve. Vertical sigma bands (1, 2, 3 standard deviations) are etched into it, a
// magenta mean line runs down the middle, and it juggles two floating dice (random draws)
// that re-roll every frame. Original design, 96x96.
import { writeFileSync } from "node:fs";
import { Canvas, toModule } from "./raster.mjs";

const W = 96, H = 96;
const palette = {
  k: "#0f1230", i: "#232a5c",
  a: "#2f4a8a", b: "#4f7fc4", c: "#8fc0ec", d: "#dcf2ff", // ice ramp
  t: "#27d6c4", m: "#ff5fc8", z: "#ffd1f0", // curve teal, mean magenta
  p: "#9a8f80", q: "#cfc6b4", r: "#efe8d8", s: "#ffffff", // dice ivory ramp
  e: "#0c0f26", w: "#ffffff", x: "#ff4f6d", g: "#9af7ff",
};
const ICE = ["a", "b", "c", "d"];
const DIE = ["p", "q", "r", "s"];
const SKIP = new Set(["t", "m", "z", "g"]);
const base = { dy: 0, squash: 0, eye: "open", dice: 0, flash: 0, roll: 0, shards: 0, glow: 0, throw: 0, bob: 0 };
const PIPS = {
  1: [[0, 0]], 2: [[-2, -2], [2, 2]], 3: [[-2, -2], [0, 0], [2, 2]],
  4: [[-2, -2], [2, -2], [-2, 2], [2, 2]], 5: [[-2, -2], [2, -2], [0, 0], [-2, 2], [2, 2]],
  6: [[-2, -3], [2, -3], [-2, 0], [2, 0], [-2, 3], [2, 3]],
};
function die(c, cx, cy, face, tilt = 0) {
  const part = c.nextPart();
  c.rect(cx - 6, cy - 6, 12, 12, "r", part);
  c.rect(cx - 6, cy - 6, 12, 2, "s", part); c.rect(cx - 6, cy - 6, 2, 12, "s", part);
  c.rect(cx + 4, cy - 4, 2, 10, "q", part); c.rect(cx - 4, cy + 4, 10, 2, "p", part);
  if (tilt) { c.set(cx + 6, cy - 6, "p", part); c.set(cx - 6, cy + 5, "p", part); }
  for (const [ox, oy] of PIPS[face]) c.rect(cx + ox - 1 + (tilt ? 1 : 0), cy + oy - 1, 2, 2, "k", -1);
}
function draw(p) {
  const c = new Canvas(W, H);
  const dy = p.dy, sq = p.squash, cx = 47;
  const bottom = 82 + dy, top = 22 + dy + sq;

  // plinth: a flat ice slab (the x axis)
  c.ellipse(cx, 88 + dy * 0.3, 34, 5, ICE);
  c.ellipse(cx, 85 + dy * 0.3, 30, 3, ICE, { bias: 0.1 });

  // bell body: half-width follows 1 - exp(-t^2), narrow dome and flaring skirt
  const body = c.nextPart();
  for (let y = top; y <= bottom; y++) {
    const t = (y - top) / (bottom - top);
    const half = Math.round(9 + 24 * (1 - Math.exp(-Math.pow(t * 2.9, 2))));
    for (let x = -half; x <= half; x++) {
      const u = x / half;
      let lvl = 1;
      if (u < -0.55) lvl = 2; else if (u > 0.62) lvl = 0; else if (u < -0.15 && t < 0.6) lvl = 2;
      if (t < 0.06) lvl = 3;
      if (t > 0.94) lvl = Math.min(lvl, 1);
      c.set(cx + x, y, ICE[lvl], body);
    }
  }
  // sigma bands: darker etched verticals at +-1, +-2 sigma (fading as they leave the dome)
  for (const off of [11, 21]) for (const sg of [-1, 1]) {
    for (let y = top + 22; y <= bottom - 3; y++) {
      const t = (y - top) / (bottom - top);
      const half = Math.round(9 + 24 * (1 - Math.exp(-Math.pow(t * 2.9, 2))));
      if (off < half - 1) c.set(cx + sg * off, y, off === 11 ? "a" : "i", -1);
    }
  }
  // the bell curve itself, drawn as a teal line over the skirt
  let prev = null;
  for (let x = -30; x <= 30; x++) {
    const yy = Math.round(bottom - 6 - 22 * Math.exp(-(x * x) / (2 * 11 * 11)));
    if (prev !== null) c.line(cx + x - 1, prev, cx + x, yy, "t", -1);
    prev = yy;
  }
  // mean line down the middle, with a star on the crown
  for (let y = top + 18; y <= bottom - 2; y++) c.set(cx, y, y % 4 === 0 ? "z" : "m", -1);
  const crown = top - 4 - (p.glow ? 1 : 0);
  c.rect(cx - 1, crown - 3, 3, 7, "m", -1); c.rect(cx - 3, crown, 7, 3, "m", -1); c.set(cx, crown + 1, "z", -1);
  if (p.glow) for (const [ox, oy] of [[-6, -2], [6, -2], [0, -7]]) c.set(cx + ox, crown + oy + 1, "z", -1);

  // face on the dome
  const hy = top + 11;
  if (p.eye === "dead") {
    for (const sg of [-1, 1]) { c.line(cx + sg * 6 - 2, hy, cx + sg * 6 + 2, hy + 4, "x"); c.line(cx + sg * 6 - 2, hy + 4, cx + sg * 6 + 2, hy, "x"); }
  } else if (p.eye === "blink") {
    c.rect(cx - 9, hy + 2, 6, 1, "k"); c.rect(cx + 4, hy + 2, 6, 1, "k");
  } else {
    const col = p.eye === "hurt" ? "x" : "g";
    c.rect(cx - 10, hy - 1, 7, 5, "e"); c.rect(cx + 4, hy - 1, 7, 5, "e");
    c.rect(cx - 8, hy, 3, 3, col); c.rect(cx + 6, hy, 3, 3, col);
    c.set(cx - 8, hy, "w"); c.set(cx + 6, hy, "w");
  }
  c.rect(cx - 4, hy + 8, 9, 1, "k", -1);
  c.rect(cx - 12, hy - 4, 8, 1, "i", -1); c.rect(cx + 5, hy - 4, 8, 1, "i", -1); // brows

  // floating dice for fists; they re-roll through `roll` and `throw` carries one outward
  const lift = p.bob;
  die(c, cx - 40, 56 + dy - lift, 1 + ((p.roll + 2) % 6), p.roll % 2);
  die(c, Math.min(cx + 40 + p.throw * 9, 87), 56 + dy + lift - p.throw * 8, 1 + ((p.roll * 5 + 3) % 6), (p.roll + 1) % 2);
  // little tether sparkles between body and dice
  for (const sg of [-1, 1]) for (let i = 0; i < 3; i++) c.set(cx + sg * (31 + i * 3), 56 + dy + i - lift * (sg < 0 ? 1 : -1), "g", -1);

  // attack: a stream of dice-pip bursts out of the thrown die
  if (p.beam) {
    const sx = cx + 46 + p.throw * 9, sy = 52 + dy - p.throw * 8;
    for (let k = 0; k < p.beam; k++) c.rect(Math.min(sx + 4 + k * 5, 91), sy + (k % 2 ? 4 : -2) - k, 3, 3, k % 2 ? "z" : "t", -1);
  }
  if (p.flash) for (const [ox, oy] of [[-20, -8], [22, -6], [0, -14]]) c.set(cx + ox, top + 20 + oy + 12, "w", -1);
  if (p.shards) for (const [x, y] of [[12, 74], [80, 70], [22, 56], [72, 54]]) c.rect(x, y - p.shards * 3, 3, 3, "c");

  c.outline("k", "i", SKIP);
  return c.rows();
}

const P = (o) => ({ ...base, ...o });
const anims = {
  idle: [P({ roll: 0 }), P({ roll: 1, dy: -1, bob: 1 }), P({ roll: 2, dy: -2, glow: 1 }), P({ roll: 3, dy: -1, bob: 1, eye: "blink" })].map(draw),
  attack: [
    P({ squash: 3, dy: 2, roll: 4 }),
    P({ throw: 1, roll: 5, beam: 1 }),
    P({ throw: 2, roll: 0, beam: 2, flash: 1 }),
    P({ throw: 2, roll: 1, beam: 3, flash: 1 }),
    P({ throw: 0, roll: 2 }),
  ].map(draw),
  hurt: [P({ dy: 1, eye: "hurt", flash: 1, roll: 3 }), P({ eye: "hurt", roll: 4 }), P({ dy: 2, eye: "hurt", roll: 5 })].map(draw),
  faint: [P({ dy: 3, squash: 4, eye: "hurt" }), P({ dy: 8, squash: 10, eye: "dead", shards: 1 }), P({ dy: 12, squash: 16, eye: "dead", shards: 2 }), P({ dy: 14, squash: 20, eye: "dead", shards: 3 })].map(draw),
};

writeFileSync("game/sprites/creatures/warden-bell.ts", toModule({
  id: "warden-bell", name: "WARDEN BELL", exportName: "WARDEN_BELL", w: W, h: H, palette,
  doc: "Warden Bell, the Probability Peaks guardian. Front view, 96×96. A glacier-ice golem shaped like a bell curve: sigma bands are etched into its body, a magenta mean line runs down the middle, and two dice float beside it as fists, re-rolling every frame.",
  fps: { idle: 4, attack: 7, hurt: 8, faint: 4 }, anims, generator: "scripts/art/warden-bell.mjs",
}));
console.log("wrote warden-bell");
