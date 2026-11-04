// Generates game/sprites/creatures/warden-basis.ts
// Warden Basis, the Vector Vale guardian: a crystal golem whose body is the unit
// square sheared by a matrix. One arm ends in the gold x-axis arrow, the other
// in the rose y-axis arrow; the torso shears (idle/attack) like a linear map.
// Original design, 96x96.
import { writeFileSync } from "node:fs";
import { Canvas, toModule } from "./raster.mjs";

const W = 96, H = 96;
const palette = {
  k: "#120d24", i: "#241a52",
  a: "#2c2a78", b: "#4a48c4", c: "#7a78f0", d: "#c4c2ff", // crystal ramp
  p: "#3a3050", q: "#5a4a7a", r: "#8a74b0", s: "#c0b0e0", // stone ramp
  y: "#ffd343", o: "#f0a020", // x-axis arrow
  z: "#ff5a6a", t: "#b02a48", // y-axis arrow
  w: "#ffffff", e: "#101020", g: "#bfe9ff", x: "#ff4f6d",
};
const CRYSTAL = ["a", "b", "c", "d"];
const STONE = ["p", "q", "r", "s"];
const SKIP = new Set(["g", "y", "o", "z", "t"]);
const base = { dy: 0, shear: 0, squash: 0, arm: 0, eye: "open", beam: 0, flash: 0, bob: 0, shards: 0 };

/** Shaded parallelogram: bottom edge b0->b1, top edge shifted by (sx, -h). */
function para(c, x0, y0, wid, h, sx, ramp, part = c.nextPart()) {
  for (let y = 0; y < h; y++) {
    const v = y / (h - 1); // 0 at bottom, 1 at top
    const off = Math.round(sx * v);
    for (let x = 0; x < wid; x++) {
      const u = x / (wid - 1);
      let lvl = 1;
      if (v > 0.86) lvl = 3; else if (u < 0.1) lvl = 2; else if (u > 0.9 || v < 0.08) lvl = 0; else if (u * 0.6 + v * 0.8 > 0.9) lvl = 2;
      // inner basis grid: a cross through the middle, like a 2x2 matrix
      if (Math.abs(u - 0.5) < 0.02 || Math.abs(v - 0.5) < 0.025) lvl = Math.max(0, lvl - 1);
      c.set(x0 + x + off, y0 - y, ramp[lvl], part);
    }
  }
  return part;
}
function thick(c, x0, y0, x1, y1, ch, n = 1) {
  const vertical = Math.abs(y1 - y0) > Math.abs(x1 - x0);
  for (let k = -n; k <= n; k++) c.line(x0 + (vertical ? k : 0), y0 + (vertical ? 0 : k), x1 + (vertical ? k : 0), y1 + (vertical ? 0 : k), ch);
}
function arrow(c, x0, y0, x1, y1, main, dark) {
  thick(c, x0, y0, x1, y1, main, 1);
  const dx = Math.sign(x1 - x0), dy = Math.sign(y1 - y0);
  // head: a filled triangle pointing along (dx, dy)
  for (let i = 0; i < 7; i++) {
    for (let j = -(6 - i); j <= 6 - i; j++) {
      const px = dx ? x1 - dx * (6 - i) + dx * 6 - dx * 6 + 0 : x1 + j;
      void px;
    }
  }
  for (let i = 0; i <= 6; i++) {
    const half = 6 - i;
    for (let j = -half; j <= half; j++) {
      if (dx) c.set(x1 + dx * i - dx * 2, y1 + j, j > 0 ? dark : main);
      else c.set(x1 + j, y1 + dy * i - dy * 2, j > 0 ? dark : main);
    }
  }
}

function draw(p) {
  const c = new Canvas(W, H);
  const dy = p.dy, sq = p.squash;
  const hgt = 40 - sq;
  const sx = 12 + p.shear * 3;
  const bx = 20 + (p.shear ? -p.shear : 0);
  const by = 80 + dy;

  // floating platform: two stacked slabs
  c.ellipse(46, 86 + dy * 0.3, 30, 6, STONE);
  c.ellipse(46, 83 + dy * 0.3, 24, 4, STONE, { bias: 0.1 });

  // arms behind the torso: gold arrow (right), rose arrow (left, pointing up)
  const ext = p.arm; // -1 wind-up, 0 rest, 1 strike
  const shoulderY = by - hgt * 0.7;
  const rightX = bx + 32 + sx * 0.7;
  c.ellipse(rightX + 2, shoulderY, 5, 5, CRYSTAL);
  thick(c, rightX + 2, shoulderY, rightX + 10 + ext * 6, shoulderY - 2 - p.bob, "q", 1);
  const leftX = bx - 4 + sx * 0.7;
  c.ellipse(leftX, shoulderY + 3, 5, 5, CRYSTAL);
  thick(c, leftX, shoulderY + 3, leftX - 6, shoulderY - 8 - ext * 4, "q", 1);

  // torso: the sheared unit square
  para(c, bx, by, 32, hgt, sx, CRYSTAL);
  // belly core: a glowing diamond
  const cx = bx + 16 + sx * 0.5, cy = by - hgt * 0.5;
  const r = 5 + (p.flash ? 1 : 0);
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (Math.abs(x) + Math.abs(y) <= r) c.set(cx + x, cy + y, Math.abs(x) + Math.abs(y) < r - 2 ? "w" : "g", c.nextPart());
  // the two basis arrows (columns of the matrix) held out
  arrow(c, rightX + 10 + ext * 4, shoulderY - 2 - p.bob, rightX + 22 + ext * 4, shoulderY - 2 - p.bob, "y", "o");
  arrow(c, leftX - 6, shoulderY - 10 - ext * 4, leftX - 6, shoulderY - 28 - ext * 6 - p.bob, "z", "t");

  // head: a floating crystal diamond with a visor
  const hx = bx + 16 + sx + (p.lunge ?? 0), hy = by - hgt - 12 + dy * 0.2 + (sq ? sq * 0.3 : 0);
  const head = c.nextPart();
  for (let y = -11; y <= 11; y++) for (let x = -9; x <= 9; x++) {
    if (Math.abs(x) / 9 + Math.abs(y) / 11 > 1) continue;
    const lvl = y < -5 ? 3 : x < -3 ? 2 : x > 3 ? 0 : 1;
    c.set(hx + x, hy + y, CRYSTAL[lvl], head);
  }
  if (p.eye === "dead") {
    for (const sgn of [-1, 1]) { c.line(hx + sgn * 3 - 2, hy - 2, hx + sgn * 3 + 2, hy + 2, "x"); c.line(hx + sgn * 3 - 2, hy + 2, hx + sgn * 3 + 2, hy - 2, "x"); }
  } else if (p.eye === "blink") {
    c.rect(hx - 6, hy, 12, 1, "k");
  } else {
    c.rect(hx - 7, hy - 3, 14, 6, "e");
    const col = p.eye === "hurt" ? "x" : "g";
    c.rect(hx - 5, hy - 2, 4, 4, col); c.rect(hx + 2, hy - 2, 4, 4, col);
    c.set(hx - 5, hy - 2, "w"); c.set(hx + 2, hy - 2, "w");
  }
  // floating orbit crystals (small diamonds) around the head
  for (const [ox, oy] of [[-18, -2], [18, -6]]) {
    const wob = (p.bob + (ox > 0 ? 1 : 0)) % 2;
    c.rect(hx + ox, hy + oy + wob, 3, 3, "c"); c.set(hx + ox, hy + oy + wob, "d");
  }

  // attack beam along the x axis
  if (p.beam) {
    const y0 = shoulderY - 2;
    for (let x = rightX + 13 + ext * 4; x < W; x++) for (let k = -p.beam; k <= p.beam; k++) c.set(x, y0 + k, k === 0 ? "w" : "g", -1);
    c.disc(rightX + 12 + ext * 4, y0, p.beam + 3, p.beam + 3, "g");
  }
  // faint shards
  if (p.shards) for (const [x, y] of [[12, 70], [80, 66], [20, 54], [74, 52]]) c.rect(x, y - p.shards * 3, 3, 3, "c");

  c.outline("k", "i", SKIP);
  return c.rows();
}

const P = (o) => ({ ...base, ...o });
const anims = {
  idle: [P({}), P({ shear: 1, dy: -1, bob: 1 }), P({ shear: 2, dy: -2 }), P({ shear: 1, dy: -1, bob: 1, eye: "blink" })].map(draw),
  attack: [
    P({ arm: -1, shear: 0, squash: 3, dy: 2, eye: "open" }),
    P({ arm: 1, shear: 3, beam: 1 }),
    P({ arm: 1, shear: 4, beam: 3, flash: 1 }),
    P({ arm: 1, shear: 3, beam: 2 }),
    P({ arm: 0, shear: 1 }),
  ].map(draw),
  hurt: [P({ shear: -2, dy: 1, eye: "hurt", flash: 1 }), P({ shear: 3, eye: "hurt" }), P({ shear: 1, dy: 2, eye: "hurt" })].map(draw),
  faint: [P({ dy: 3, squash: 4, eye: "hurt" }), P({ dy: 8, squash: 10, eye: "dead", shards: 1 }), P({ dy: 12, squash: 16, eye: "dead", shards: 2 }), P({ dy: 14, squash: 20, eye: "dead", shards: 3 })].map(draw),
};

writeFileSync("game/sprites/creatures/warden-basis.ts", toModule({
  id: "warden-basis", name: "WARDEN BASIS", exportName: "WARDEN_BASIS", w: W, h: H, palette,
  doc: "Warden Basis, the Vector Vale guardian. Front view, 96×96. A crystal golem whose torso is the unit square sheared by a matrix; its arms hold the gold x-axis and rose y-axis basis arrows.",
  fps: { idle: 4, attack: 7, hurt: 8, faint: 4 }, anims, generator: "scripts/art/warden-basis.mjs",
}));
console.log("wrote warden-basis");
