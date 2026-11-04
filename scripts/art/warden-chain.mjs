// Generates game/sprites/creatures/warden-chain.ts
// Warden Chain, the Gradient Gorge guardian: a canyon-rock golem. Its torso is a
// bowl (a loss surface) with a glowing ball rolling down inside it (gradient
// descent); both arms are chains of three linked rings (the chain rule); a green
// nabla (∇) is carved on its brow. Original design, 96x96.
import { writeFileSync } from "node:fs";
import { Canvas, toModule } from "./raster.mjs";

const W = 96, H = 96;
const palette = {
  k: "#1c0f14", i: "#3a1c20",
  a: "#4a2a2a", b: "#7a4a3a", c: "#a86a4a", d: "#d8a078", // rock ramp
  p: "#3a2430", q: "#5a3a44", r: "#8a5e60", s: "#c4a0a0", // iron ramp
  o: "#ff7a3a", y: "#ffd27a", u: "#fff4cc", // ball glow
  n: "#7cf0a0", m: "#2a9a60", // nabla
  e: "#101020", w: "#ffffff", x: "#ff4f6d", g: "#e8ffe8",
};
const ROCK = ["a", "b", "c", "d"];
const IRON = ["p", "q", "r", "s"];
const SKIP = new Set(["o", "y", "u", "n", "m", "g"]);
const base = { dy: 0, squash: 0, arm: 0, eye: "open", ball: 0, flash: 0, bob: 0, shards: 0, glow: 0 };

function ring(c, cx, cy, r, ch, hi) {
  for (let a = 0; a < 48; a++) {
    const t = (a / 48) * Math.PI * 2;
    const x = Math.round(cx + Math.cos(t) * r), y = Math.round(cy + Math.sin(t) * r * 0.8);
    c.set(x, y, a > 28 && a < 42 ? hi : ch, -1);
    c.set(x + (Math.cos(t) > 0 ? -1 : 1), y, ch, -1);
  }
}
/** A chain of three rings from (x0,y0) toward (x1,y1). */
function chain(c, x0, y0, x1, y1) {
  for (let i = 0; i < 3; i++) {
    const t = i / 2;
    ring(c, Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), i === 2 ? 5 : 4, "r", "s");
  }
}
function draw(p) {
  const c = new Canvas(W, H);
  const dy = p.dy, sq = p.squash;
  const cx = 47;
  const by = 80 + dy;

  // floating slab
  c.ellipse(cx, 87 + dy * 0.3, 30, 6, ROCK);
  c.ellipse(cx, 84 + dy * 0.3, 24, 4, ROCK, { bias: 0.1 });

  // arms: chains hanging from rocky shoulders
  const ext = p.arm; // -1 wind-up, 0 rest, 1 strike
  const shY = by - 40 + sq;
  c.ellipse(cx + 30, shY, 7, 6, ROCK); c.ellipse(cx - 30, shY, 7, 6, ROCK);
  chain(c, cx + 34, shY + 8, cx + 40 + ext * 8, shY + 20 - ext * 8 + p.bob);
  chain(c, cx - 34, shY + 8, cx - 38 - ext * 2, shY + 24 - p.bob);
  // fists: iron balls
  c.ellipse(cx + 44 + ext * 9, shY + 25 - ext * 12 + p.bob, 6, 6, IRON);
  c.ellipse(cx - 40 - ext * 2, shY + 30 - p.bob, 6, 6, IRON);

  // torso: a bowl, flat top, rounded bottom
  const top = by - 42 + sq, bottom = by;
  const bowl = c.nextPart();
  for (let y = top; y <= bottom; y++) {
    const v = (y - top) / (bottom - top);
    const half = Math.round(26 * Math.sqrt(Math.max(0, 1 - Math.pow(1 - v, 2) * 0.55)) * (0.55 + 0.45 * Math.min(1, v * 2.2)));
    for (let x = -half; x <= half; x++) {
      const u = x / Math.max(1, half);
      let lvl = 1;
      if (u < -0.6) lvl = 2; else if (u > 0.7 || v > 0.9) lvl = 0; else if (u < -0.2 && v < 0.5) lvl = 2;
      if (v < 0.07) lvl = 3;
      c.set(cx + x, y, ROCK[lvl], bowl);
    }
  }
  // the dished cavity: a dark parabola on the face of the bowl
  const cavH = Math.round((bottom - top) * 0.62);
  for (let y = 0; y < cavH; y++) {
    const v = y / (cavH - 1);
    const half = Math.round(19 * Math.sqrt(1 - Math.pow(1 - v, 2) * 0.9));
    for (let x = -half; x <= half; x++) c.set(cx + x, top + 4 + y, y > cavH - 4 ? "p" : "i", -1);
  }
  // the ball rolls down the right wall into the bottom (ball = 0..1 position along the bowl)
  const bt = p.ball; // -1 left rim, 0 rest at bottom, 1 right rim
  const bxp = cx + Math.round(bt * 14), byp = top + 4 + cavH - 8 - Math.round(Math.abs(bt) * Math.abs(bt) * 12);
  const R = 6 + (p.flash ? 1 : 0) + (p.glow ? 1 : 0);
  for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
    const d = x * x + y * y; if (d > R * R) continue;
    const ch = d < 5 ? "u" : d < R * R * 0.4 ? "y" : "o";
    c.set(bxp + x, byp + y, ch, -1);
  }
  if (p.glow) for (const [ox, oy] of [[-R - 2, -2], [R + 2, -2], [0, -R - 2]]) c.set(bxp + ox, byp + oy, "y", -1);
  // trail marks (descent path) along the cavity
  for (let i = 0; i < 4; i++) c.set(cx - 14 + i * 3 + (p.bob ? 1 : 0), top + 8 + i * 2, "m", -1);

  // head: a boulder with brow and nabla
  const hx = cx + (p.lunge ?? 0), hy = top - 11 + (sq ? sq * 0.3 : 0);
  c.ellipse(hx, hy, 14, 12, ROCK);
  c.rect(hx - 11, hy - 4, 22, 3, "a", -1); // heavy brow
  for (let i = 0; i < 4; i++) c.rect(hx - 3 + i, hy - 10 + i, 7 - 2 * i, 1, "n", -1); // ∇ inverted triangle on the brow
  c.set(hx, hy - 10, "g", -1);
  if (p.eye === "dead") {
    for (const sg of [-1, 1]) { c.line(hx + sg * 5 - 2, hy, hx + sg * 5 + 2, hy + 4, "x"); c.line(hx + sg * 5 - 2, hy + 4, hx + sg * 5 + 2, hy, "x"); }
  } else if (p.eye === "blink") {
    c.rect(hx - 8, hy + 2, 6, 1, "k"); c.rect(hx + 3, hy + 2, 6, 1, "k");
  } else {
    const col = p.eye === "hurt" ? "x" : "n";
    c.rect(hx - 9, hy - 1, 7, 5, "e"); c.rect(hx + 3, hy - 1, 7, 5, "e");
    c.rect(hx - 7, hy, 3, 3, col); c.rect(hx + 5, hy, 3, 3, col);
    c.set(hx - 7, hy, "w"); c.set(hx + 5, hy, "w");
  }
  // jaw line: a rock mouth
  c.rect(hx - 5, hy + 8, 11, 1, "k", -1);

  // attack: the right chain whips out with an orange shock ring
  if (p.beam) {
    const sx = cx + 44 + ext * 9, sy = shY + 25 - ext * 12 + p.bob;
    for (let k = 0; k < p.beam; k++) ring(c, Math.min(sx + 3 + k * 4, 86 - k * 2), sy, 4 + k * 2, k % 2 ? "y" : "o", "u");
  }
  if (p.shards) for (const [x, y] of [[12, 70], [80, 66], [20, 54], [74, 52]]) c.rect(x, y - p.shards * 3, 3, 3, "c");

  c.outline("k", "i", SKIP);
  return c.rows();
}

const P = (o) => ({ ...base, ...o });
const anims = {
  idle: [P({ ball: 0 }), P({ ball: 0.5, dy: -1, bob: 1 }), P({ ball: 0, dy: -2, glow: 1 }), P({ ball: -0.5, dy: -1, bob: 1, eye: "blink" })].map(draw),
  attack: [
    P({ arm: -1, squash: 3, dy: 2, ball: -1 }),
    P({ arm: 1, ball: -0.3, beam: 1 }),
    P({ arm: 1, ball: 0.4, beam: 2, flash: 1 }),
    P({ arm: 1, ball: 1, beam: 3, flash: 1 }),
    P({ arm: 0, ball: 0.3 }),
  ].map(draw),
  hurt: [P({ dy: 1, eye: "hurt", flash: 1, ball: 0.7 }), P({ eye: "hurt", ball: -0.7 }), P({ dy: 2, eye: "hurt" })].map(draw),
  faint: [P({ dy: 3, squash: 4, eye: "hurt" }), P({ dy: 8, squash: 10, eye: "dead", shards: 1, ball: 0.3 }), P({ dy: 12, squash: 16, eye: "dead", shards: 2 }), P({ dy: 14, squash: 20, eye: "dead", shards: 3 })].map(draw),
};

writeFileSync("game/sprites/creatures/warden-chain.ts", toModule({
  id: "warden-chain", name: "WARDEN CHAIN", exportName: "WARDEN_CHAIN", w: W, h: H, palette,
  doc: "Warden Chain, the Gradient Gorge guardian. Front view, 96×96. A canyon-rock golem whose bowl-shaped torso holds a glowing ball rolling downhill; its arms are chains of three linked rings (the chain rule) and a green nabla marks its brow.",
  fps: { idle: 4, attack: 7, hurt: 8, faint: 4 }, anims, generator: "scripts/art/warden-chain.mjs",
}));
console.log("wrote warden-chain");
