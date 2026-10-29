// Generates game/sprites/creatures/noise-minion.ts
// Static, the Noise minion: a fuzzy ball of TV-static. Its body is dithered with
// jittering grain pixels, spiky fuzz tufts ring its silhouette, one big
// bloodshot eye glares from the middle, and loose glitch blocks orbit it.
// It reads as "noise in the data". Original design.
import { writeFileSync } from "node:fs";
import { Canvas, toModule } from "./raster.mjs";

const W = 64;
const H = 64;

const palette = {
  k: "#1a0b24", // outline
  // magenta-violet body ramp (dark -> light)
  a: "#3b1450",
  b: "#6a2a86",
  c: "#a44bb5",
  d: "#e287d8",
  // grain pixels
  g: "#f5e9ff",
  h: "#0f0818",
  // glitch cyan / lime fx
  m: "#18b6c9",
  n: "#8af7f0",
  l: "#c6ff5e",
  // eye
  w: "#ffffff",
  r: "#ff4f6d", // iris / bloodshot
  i: "#1a0b24", // pupil
  y: "#ffd24a", // tooth / spark
  x: "#ff4f6d", // KO marks
  q: "#e6fffe", // glow
};
const BODY = ["a", "b", "c", "d"];
const SKIP = new Set(["q", "m", "n", "l", "g", "h"]);

const base = { bx: 0, by: 0, squash: 0, eye: "open", mouth: 0, jit: 0, fuzz: 0, scale: 1, bolt: 0, glitch: 0 };

/** tiny seeded RNG so every frame is deterministic */
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

function draw(p) {
  const c = new Canvas(W, H);
  const rnd = rng(7 + p.jit * 101);
  const S = p.scale;
  const cx = 32 + p.bx;
  const sq = 1 - p.squash * 0.08;
  const cy = 36 + p.by;
  const ground = 58;

  // loose glitch blocks orbiting the body (behind)
  const bits = [[-24, -16, 3, 2, "m"], [23, -8, 2, 3, "n"], [-21, 6, 2, 2, "l"], [25, 12, 3, 2, "m"], [-10, -27, 2, 2, "n"]];
  bits.forEach(([dx, dy, w, h, ch], i) => {
    const sh = p.glitch ? ((i + p.jit) % 3) - 1 : 0;
    c.rect(Math.round(cx + dx + sh * p.glitch * 2), Math.round(cy + dy + sh), w, h, ch, c.nextPart());
  });

  // stubby legs
  for (const sx of [-9, 9]) {
    c.ellipse(cx + sx * S, ground - 4, 5, 4.2, BODY, { bias: 0.05, part: c.nextPart() });
  }

  // fuzz tufts: small spikes around the silhouette, length wobbles with jitter
  const rx = 19 * S;
  const ry = 17 * sq * S;
  const spikes = 18;
  for (let k = 0; k < spikes; k++) {
    const a = (k / spikes) * Math.PI * 2 + 0.2;
    const len = 4 + ((k * 7 + p.jit * 3) % 4) + p.fuzz;
    const x0 = cx + Math.cos(a) * (rx - 1);
    const y0 = cy + Math.sin(a) * (ry - 1);
    if (y0 > ground - 6) continue;
    const x1 = cx + Math.cos(a) * (rx + len);
    const y1 = cy + Math.sin(a) * (ry + len);
    c.line(x0, y0, x1, y1, k % 3 === 0 ? "c" : "b", c.nextPart());
  }

  // body
  const body = c.ellipse(cx, cy, rx, ry, BODY, { part: c.nextPart() });

  // static grain: dither the body with light and dark speckles (decal on the body)
  c.decal((keep) => {
    const n = 70 + p.jit * 6;
    for (let k = 0; k < n; k++) {
      const x = Math.round(cx - rx + rnd() * rx * 2);
      const y = Math.round(cy - ry + rnd() * ry * 2);
      if (!keep(x, y)) continue;
      c.set(x, y, rnd() < 0.5 ? "g" : "h", body);
    }
    // horizontal scanline tears
    const ty = Math.round(cy - 6 + ((p.jit * 5) % 12));
    for (let x = Math.round(cx - rx); x <= cx + rx; x++) if (keep(x, ty) && x % 2 === 0) c.set(x, ty, "d", body);
  }, body);

  // eye: one big bloodshot eye
  const ex = cx;
  const ey = cy - 3 + (p.eye === "hurt" ? 1 : 0);
  if (p.eye === "dead") {
    for (const sgn of [-1, 1]) {
      const x = ex + sgn * 0;
    }
    c.line(ex - 5, ey - 4, ex + 5, ey + 4, "x");
    c.line(ex - 5, ey + 4, ex + 5, ey - 4, "x");
  } else if (p.eye === "blink") {
    c.rect(ex - 8, ey, 16, 2, "k");
  } else {
    const ry2 = p.eye === "focus" ? 6 : 8;
    c.disc(ex, ey, 9, ry2, "w");
    c.disc(ex + (p.eye === "focus" ? 1 : 0), ey, 5, Math.min(ry2 - 1, 5), "r");
    c.disc(ex + (p.eye === "focus" ? 1 : 0), ey, 2.4, p.eye === "focus" ? 1.6 : 3, "i");
    c.set(ex - 2, ey - 3, "w");
    // bloodshot veins
    c.line(ex - 9, ey, ex - 6, ey, "r");
    c.line(ex + 6, ey - 1, ex + 9, ey - 2, "r");
    // heavy lid
    c.line(ex - 9, ey - ry2 + 1, ex + 9, ey - ry2 + 1, "k");
    if (p.eye === "hurt") c.line(ex - 8, ey - 2, ex + 8, ey - 2, "k");
  }

  // jagged mouth
  const my = cy + 10;
  if (p.mouth === 0) {
    for (let x = -7; x <= 7; x++) c.set(ex + x, my + (x % 2 === 0 ? 0 : 1), "k");
  } else {
    const h = p.mouth === 2 ? 5 : 3;
    c.rect(ex - 8, my, 16, h, "k");
    for (let x = -8; x < 8; x += 4) {
      c.rect(ex + x, my, 2, 2, "y");
      c.rect(ex + x + 2, my + h - 2, 2, 2, "y");
    }
  }

  // attack: a ball of crackling noise ahead of the creature
  if (p.bolt) {
    const bx = ex;
    const by = cy - ry - 8;
    c.disc(bx, by, p.bolt, p.bolt, "q");
    for (let k = 0; k < 10 + p.bolt * 3; k++) {
      const a = rnd() * Math.PI * 2;
      const r = rnd() * (p.bolt + 3);
      c.set(bx + Math.cos(a) * r, by + Math.sin(a) * r, k % 2 ? "m" : "g", c.nextPart());
    }
  }

  c.outline("k", "a", SKIP);
  return c.rows();
}

const P = (o) => ({ ...base, ...o });

const anims = {
  idle: [
    P({ jit: 1 }),
    P({ jit: 2, by: 1, glitch: 1, fuzz: 1 }),
    P({ jit: 3, by: 0, fuzz: 0 }),
    P({ jit: 4, by: 1, eye: "blink", glitch: 1 }),
  ].map(draw),
  attack: [
    P({ jit: 5, by: 2, squash: 2, eye: "focus", fuzz: 2 }),
    P({ jit: 6, by: 1, squash: 1, eye: "focus", mouth: 1, bolt: 3, glitch: 1 }),
    P({ jit: 7, scale: 1.05, eye: "focus", mouth: 2, bolt: 5, glitch: 1, fuzz: 3 }),
    P({ jit: 8, by: -1, scale: 1.07, eye: "focus", mouth: 2, bolt: 6, glitch: 1, fuzz: 3 }),
    P({ jit: 9 }),
  ].map(draw),
  hurt: [
    P({ jit: 10, bx: -2, by: 1, squash: 1.5, eye: "hurt", mouth: 2, glitch: 1 }),
    P({ jit: 11, bx: 2, squash: 1, eye: "hurt", mouth: 2, glitch: 1 }),
    P({ jit: 12, by: 1, squash: 1.5, eye: "hurt", mouth: 0 }),
  ].map(draw),
  faint: [
    P({ jit: 13, by: 2, squash: 2, eye: "hurt", mouth: 2 }),
    P({ jit: 14, by: 6, squash: 4, eye: "dead", mouth: 2, glitch: 1 }),
    P({ jit: 15, by: 9, squash: 6, eye: "dead", mouth: 2, glitch: 1 }),
    P({ jit: 16, by: 11, squash: 8, eye: "dead", mouth: 2, glitch: 1 }),
  ].map(draw),
};

writeFileSync(
  "game/sprites/creatures/noise-minion.ts",
  toModule({
    id: "noise-minion",
    name: "STATIC",
    doc: "Static, the Noise minion. Front view, 64×64. A fuzzy ball of grain with one bloodshot eye; its speckles re-roll each frame so it never sits still.",
    exportName: "NOISE_MINION",
    w: W,
    h: H,
    palette,
    fps: { idle: 6, attack: 7, hurt: 8, faint: 5 },
    anims,
    generator: "scripts/art/noise-minion.mjs",
  }),
);
console.log("wrote noise-minion");
