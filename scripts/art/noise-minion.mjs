// Generates game/sprites/creatures/noise-minion.ts
// Static, a Noise minion: a lumpy blob of corrupted signal. One glaring eye with
// a scanline pupil, a jagged mouth of broken-pixel teeth, stubby legs, and a
// fringe of random speckle ("noise") that re-rolls every frame. Horizontal
// glitch tears shear bands of the body sideways. Original design.
import { writeFileSync } from "node:fs";
import { Canvas, toModule } from "./raster.mjs";

const W = 64;
const H = 64;

const palette = {
  k: "#120a1e", // outline
  // corrupted violet body ramp (dark -> light)
  a: "#2b1648",
  b: "#4d2a86",
  c: "#7a45c4",
  d: "#b57cf2",
  // magenta glitch ramp
  m: "#6e1650",
  n: "#c02a85",
  o: "#ff5fb4",
  p: "#ffc2e4",
  // static speckle
  s: "#d8d4e6",
  t: "#7e7894",
  // eye and teeth
  y: "#f4ffa8",
  z: "#a6e22e",
  w: "#ffffff",
  i: "#1a0f2a",
  x: "#ff4f6d", // KO marks
};
const BODY = ["a", "b", "c", "d"];
const GLITCH = ["m", "n", "o", "p"];
const SKIP = new Set(["s", "t"]);

const base = {
  bx: 0, by: 0, // body offset
  squash: 0, // >0 flattens
  seed: 1, // speckle / tear pattern
  tears: 1, // number of shear bands
  tearAmt: 2, // shear distance in pixels
  eye: "open", // open | blink | hurt | dead | glare
  mouth: 0, // 0 closed, 1 grin, 2 open
  scale: 1, // lunge toward the viewer
  legs: 0, // -1..1 step
  spikes: 0, // raised noise spikes on top
};
const P = (o) => ({ ...base, ...o });

/** Small deterministic PRNG so frames are reproducible. */
function rng(seed) {
  let s = (seed * 2654435761) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function shearRows(c, y0, y1, dx) {
  for (let y = y0; y < y1; y++) {
    const row = c.px[y];
    const ids = c.id[y];
    const nr = Array(c.w).fill(".");
    const ni = Array(c.w).fill(-1);
    for (let x = 0; x < c.w; x++) {
      const nx = x + dx;
      if (nx >= 0 && nx < c.w && row[x] !== ".") {
        nr[nx] = row[x];
        ni[nx] = ids[x];
      }
    }
    c.px[y] = nr;
    c.id[y] = ni;
  }
}

function draw(p) {
  const c = new Canvas(W, H);
  const r = rng(p.seed);
  const S = p.scale;
  const cx = 32 + p.bx;
  const ground = 57;
  const sq = 1 - p.squash * 0.09;
  const cy = 36 + p.by + p.squash * 1.6;

  // stubby legs
  const step = p.legs * 3;
  c.ellipse(cx - 10 * S, ground - 3 + (step > 0 ? -step : 0), 6, 4, BODY, { bias: -0.1, part: c.nextPart() });
  c.ellipse(cx + 10 * S, ground - 3 + (step < 0 ? step : 0), 6, 4, BODY, { bias: -0.1, part: c.nextPart() });

  // noise spikes (antennae of corrupted signal)
  for (let i = 0; i < 3 + p.spikes; i++) {
    const sx = cx - 12 + i * (24 / (2 + p.spikes)) + (r() - 0.5) * 3;
    const len = 6 + p.spikes * 2 + Math.floor(r() * 6);
    c.line(sx, cy - 16 * sq, sx + (r() - 0.5) * 6, cy - 16 * sq - len, i % 2 ? "n" : "c", c.nextPart());
  }

  // body: a lumpy blob from overlapping ellipses
  c.ellipse(cx, cy, 20 * S, 17 * sq * S, BODY, { part: c.nextPart() });
  c.ellipse(cx - 12 * S, cy + 4, 10 * S, 11 * sq, BODY, { part: c.nextPart() });
  c.ellipse(cx + 13 * S, cy + 3, 9 * S, 12 * sq, BODY, { part: c.nextPart() });
  // magenta corruption patches (distinct parts so they get contour lines)
  c.ellipse(cx + 11 * S, cy - 9 * sq, 6, 5, GLITCH, { part: c.nextPart(), clip: (x, y) => c.id[y]?.[x] >= 0 });
  c.ellipse(cx - 13 * S, cy + 9 * sq, 5, 4, GLITCH, { part: c.nextPart(), clip: (x, y) => c.id[y]?.[x] >= 0 });

  // glitch tears: shear horizontal bands of the finished body
  for (let t = 0; t < p.tears; t++) {
    const y0 = Math.floor(cy - 12 + r() * 24);
    const h = 2 + Math.floor(r() * 3);
    const dir = r() < 0.5 ? -1 : 1;
    shearRows(c, y0, Math.min(H, y0 + h), dir * p.tearAmt);
  }

  // eye
  const ex = cx + 1;
  const ey = cy - 5 * sq;
  if (p.eye === "blink") {
    c.rect(ex - 7, ey, 15, 2, "i");
  } else if (p.eye === "dead") {
    for (const sx of [ex - 4, ex + 4]) {
      c.line(sx - 2, ey - 2, sx + 2, ey + 2, "x", c.nextPart());
      c.line(sx - 2, ey + 2, sx + 2, ey - 2, "x", c.nextPart());
    }
  } else {
    const big = p.eye === "hurt" ? 0.85 : 1;
    c.disc(ex, ey, 8 * big, 7 * big, "w", c.nextPart());
    c.disc(ex, ey, 6.4 * big, 5.6 * big, p.eye === "glare" ? "z" : "y", c.nextPart());
    // scanline pupil
    const py = ey + (p.eye === "glare" ? 1 : 0);
    c.rect(ex - 2, py - 4, 4, 9, "i", c.nextPart());
    c.set(ex - 1, py - 3, "w", c.nextPart());
    if (p.eye === "hurt") c.line(ex - 8, ey - 8, ex + 7, ey - 5, "i", c.nextPart());
    else {
      // angry brow
      c.line(ex - 9, ey - 7, ex + 1, ey - 4, "k", c.nextPart());
      c.line(ex + 9, ey - 8, ex + 1, ey - 4, "k", c.nextPart());
    }
  }

  // mouth: a jagged row of broken-pixel teeth
  const my = cy + 8 * sq;
  const mouthW = 18;
  if (p.mouth === 0) {
    for (let x = -mouthW / 2; x <= mouthW / 2; x++) c.set(cx + x, my + (x % 3 === 0 ? 1 : 0), "i", c.nextPart());
  } else {
    const open = p.mouth === 2 ? 5 : 2;
    c.rect(cx - mouthW / 2, my - 1, mouthW + 1, open + 1, "i", c.nextPart());
    for (let x = -mouthW / 2; x < mouthW / 2; x += 3) {
      c.rect(cx + x, my - 1, 2, 2, "w", c.nextPart());
      if (p.mouth === 2) c.rect(cx + x + 1, my + open - 1, 2, 2, "w", c.nextPart());
    }
  }

  c.outline("k", "k", SKIP);

  // speckle fringe: random static pixels hugging the silhouette
  const snap = c.px.map((row) => [...row]);
  const n = 90 + p.spikes * 8;
  for (let i = 0; i < n; i++) {
    const x = Math.floor(r() * W);
    const y = Math.floor(10 + r() * 50);
    if (snap[y][x] !== ".") continue;
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2], [3, 0], [-3, 0], [0, -3]].some(([a, b]) => snap[y + b]?.[x + a] && snap[y + b][x + a] !== ".");
    if (near) c.set(x, y, r() < 0.55 ? "s" : "t", c.nextPart());
  }
  return c.rows();
}

const frames = (list) => list.map((o) => draw(P(o)));

const anims = {
  idle: frames([
    { seed: 1, tearAmt: 2 },
    { seed: 2, by: -1, legs: 0.5, tearAmt: 1, eye: "open" },
    { seed: 3, by: -1, tearAmt: 3, spikes: 1 },
    { seed: 4, by: 0, legs: -0.5, eye: "blink", tearAmt: 2 },
  ]),
  attack: frames([
    { seed: 5, squash: 1.5, by: 1, eye: "glare", mouth: 1, tears: 2 },
    { seed: 6, squash: 2.5, by: 2, eye: "glare", mouth: 2, tears: 2, tearAmt: 3, spikes: 2 },
    { seed: 7, scale: 1.1, by: -2, bx: -3, eye: "glare", mouth: 2, tears: 3, tearAmt: 4, spikes: 2 },
    { seed: 8, scale: 1.12, by: -3, bx: -5, eye: "glare", mouth: 2, tears: 3, tearAmt: 5, spikes: 3 },
    { seed: 9, eye: "open", mouth: 1 },
  ]),
  hurt: frames([
    { seed: 10, bx: 2, by: 1, squash: 1, eye: "hurt", mouth: 2, tears: 3, tearAmt: 4 },
    { seed: 11, bx: -2, squash: 0.5, eye: "hurt", mouth: 2, tears: 4, tearAmt: 5 },
    { seed: 12, by: 1, squash: 1, eye: "hurt", mouth: 0, tears: 2 },
  ]),
  faint: frames([
    { seed: 13, by: 2, squash: 2, eye: "hurt", mouth: 2, tears: 4, tearAmt: 5 },
    { seed: 14, by: 5, squash: 4, eye: "dead", mouth: 2, tears: 5, tearAmt: 6 },
    { seed: 15, by: 7, squash: 6, eye: "dead", mouth: 2, tears: 6, tearAmt: 8 },
    { seed: 16, by: 8, squash: 7.5, eye: "dead", mouth: 2, tears: 7, tearAmt: 10 },
  ]),
};

writeFileSync(
  "game/sprites/creatures/noise-minion.ts",
  toModule({
    id: "noise-minion",
    name: "STATIC",
    doc: "Static, a Noise minion. Front view, 64×64. A lumpy blob of corrupted signal: one glaring scanline-pupil eye, broken-pixel teeth, glitch tears and a speckle fringe that re-rolls each frame.",
    exportName: "NOISE_MINION",
    w: W,
    h: H,
    palette,
    fps: { idle: 5, attack: 8, hurt: 10, faint: 5 },
    anims,
    generator: "scripts/art/noise-minion.mjs",
  }),
);
console.log("wrote noise-minion");
