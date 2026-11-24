// Generates game/sprites/creatures/neuron-pup-transformer{,-back}.ts
// Neuron-Pup, Transformer form: the pup grown taller and sleeker, with midnight-sapphire fur.
// - Belly: a row of four token tiles. One token (coral) is the query; gold arcs run from it to
//   every token, and each arc's thickness and brightness is a real softmax weight over fixed
//   query-key scores. The query moves token to token as the pup animates (every token attends).
// - Crest: three small gems fanned on the forehead (three heads); one lights per frame.
// - Tail: three stacked block segments with a gold ribbon that skips over them from base to tip
//   (the residual stream: x + sublayer(x)).
// - Back view: a dorsal stack of three blocks with a gold residual line running past each one.
// The silhouette keeps the earlier forms' round head, ears with input nodes and big tail, so the
// evolution reads as the same pup growing. Original design.
import { writeFileSync } from "node:fs";
import { Canvas, toModule } from "./raster.mjs";

const W = 64;
const H = 64;

const palette = {
  k: "#0d1226", // outline
  // midnight-sapphire fur ramp (dark -> light)
  a: "#0f1838",
  b: "#1b3672",
  c: "#2d5fa6",
  d: "#78ade3",
  // warm cream belly ramp
  e: "#b08a6a",
  f: "#d8b693",
  g: "#f2dcbc",
  h: "#fff4e2",
  // gold "attention" ramp
  m: "#7a4c0e",
  n: "#c98d1c",
  o: "#ffd04d",
  p: "#fff5c4",
  // coral "query" ramp
  u: "#8a2340",
  v: "#d9466a",
  y: "#ff8fa3",
  z: "#ffe2e8",
  // cyan "key/value" accents
  j: "#0f6f7c",
  l: "#4fd6e0",
  // face
  w: "#ffffff",
  i: "#0e1430", // pupil
  s: "#ffd98a", // iris tint (gold)
  r: "#ff7aa8", // cheek
  t: "#c24a78", // mouth inside
  x: "#ff4f6d", // KO marks
  q: "#fff1b0", // evolve aura
};
const FUR = ["a", "b", "c", "d"];
const BELLY = ["e", "f", "g", "h"];
const GOLD = ["m", "n", "o", "p"];
const CORAL = ["u", "v", "y", "z"];
const SKIP = new Set(["q", "p", "z", "o"]);

/**
 * Fixed query-key scores for the four belly tokens (row = query). The arc weights are
 * softmax(scores[row]) — computed here, never typed — so each frame shows a real attention row.
 */
const SCORES = [
  [1.6, 0.9, -0.4, 0.2],
  [0.3, 1.2, 1.5, -0.6],
  [-0.2, 1.4, 0.8, 1.1],
  [0.9, -0.5, 0.6, 1.8],
];
export function softmax(row) {
  const mx = Math.max(...row);
  const ex = row.map((s) => Math.exp(s - mx));
  const sum = ex.reduce((a, b) => a + b, 0);
  return ex.map((e) => e / sum);
}

/** Pose parameters; every animation frame is one of these. */
const base = {
  bx: 0, by: 0,
  hx: 0, hy: 0,
  squash: 0,
  tail: 0,
  eye: "open", // open | blink | hurt | dead | focus
  mouth: 0,
  ear: 0,
  glow: 0, // frame phase: picks the query token and the lit head
  scale: 1,
  aura: 0,
  orb: 0,
  paw: 0,
};

/** Quadratic arc from (x0,y) to (x1,y) peaking `lift` px above y. */
function arc(c, x0, x1, y, lift, ch, thick) {
  const steps = Math.max(6, Math.abs(x1 - x0) * 2);
  const mx = (x0 + x1) / 2;
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * mx + t * t * x1;
    const yy = y - 2 * (1 - t) * t * 2 * lift;
    c.set(x, yy, ch);
    if (thick) c.set(x, yy - 1, ch);
  }
}

function drawFront(p) {
  const c = new Canvas(W, H);
  const cx = 32 + p.bx;
  const S = p.scale;
  const sq = 1 - p.squash * 0.1;
  const by = 40 + p.by;
  const ground = 57;

  if (p.aura) {
    for (let k = 0; k < p.aura; k++) {
      const rr = 18 + k * 7;
      for (let a = 0; a < 360; a += 4) {
        const t = (a * Math.PI) / 180;
        const x = 32 + Math.cos(t) * (rr + 6);
        const y = 33 + Math.sin(t) * rr;
        if (k % 2 === 0 || a % 8 === 0) c.set(x, y, "q", c.nextPart());
      }
    }
  }

  // tail (behind everything): three block segments, residual ribbon skipping over them
  const swing = p.tail * 3;
  const tx0 = cx + 12 * S;
  const ty0 = by + 6;
  const seg = [
    [tx0 + 4, ty0 - 2],
    [tx0 + 7 + swing * 0.3, ty0 - 8],
    [tx0 + 6 + swing * 0.6, ty0 - 14],
  ];
  const tailPart = c.nextPart();
  c.ellipse(tx0, ty0, 3.4, 3.4, FUR, { part: tailPart });
  seg.forEach(([x, y]) => {
    c.ellipse(x, y, 3.6, 3, FUR, { part: tailPart });
  });
  seg.forEach(([x, y], i) => {
    // block face: a small dark band so each segment reads as a layer
    c.line(x - 2, y + 1, x + 2, y + 1, i === p.glow % 3 ? "c" : "a", c.nextPart());
  });
  // the ribbon: from the tail root around the outside of the segments to the tip
  const tip = [seg[2][0] - 3, seg[2][1] - 4];
  c.ellipse(tip[0], tip[1], 3.2, 3.2, GOLD, { bias: 0.1 + p.glow * 0.05, part: c.nextPart() });
  c.disc(tip[0] - 1, tip[1] - 1, 1, 1, "p");
  for (let k = 0; k <= 24; k++) {
    const t = k / 24;
    const x = tx0 + 2 + (seg[1][0] + 4 - tx0) * Math.sin(t * Math.PI) + (tip[0] - tx0 - 2) * t;
    const y = ty0 - 1 + (tip[1] - ty0 + 1) * t;
    c.set(x, y, "o");
    c.set(x + 1, y, "n");
  }

  // haunches and hind feet
  c.ellipse(cx - 16 * S, ground - 7, 6.5, 6, FUR, { part: c.nextPart() });
  c.ellipse(cx + 16 * S, ground - 7, 6.5, 6, FUR, { part: c.nextPart() });
  c.ellipse(cx - 14 * S, ground - 1.5, 6, 3.2, FUR, { bias: 0.1, part: c.nextPart() });
  c.ellipse(cx + 14 * S, ground - 1.5, 6, 3.2, FUR, { bias: 0.1, part: c.nextPart() });

  // body (a touch taller than earlier forms) and belly
  c.ellipse(cx, by + 3, 15 * S, 15 * sq * S, FUR, { part: c.nextPart() });
  c.ellipse(cx, by + 6, 10 * S, 11 * sq * S, BELLY, { part: c.nextPart() });

  // tokens + attention row: query = glow % 4, arc weight = softmax(SCORES[query])
  const q = p.glow % 4;
  const wts = softmax(SCORES[q]);
  const ty = by + 4;
  const tx = [-7.5, -2.5, 2.5, 7.5].map((d) => cx + d * S);
  const order = wts.map((w, k) => [w, k]).sort((A, B) => A[0] - B[0]);
  for (const [w, k] of order) {
    if (k === q) continue;
    const ch = w > 0.3 ? "o" : w > 0.15 ? "n" : "m";
    arc(c, tx[q], tx[k], ty - 2, 2 + Math.abs(k - q) * 1.4, ch, w > 0.3);
  }
  // self-attention: a small loop above the query token, bright when its own weight is large
  const self = wts[q];
  const sc = self > 0.3 ? "o" : self > 0.15 ? "n" : "m";
  c.set(tx[q] - 1, ty - 4, sc);
  c.set(tx[q], ty - 5, sc);
  c.set(tx[q] + 1, ty - 4, sc);
  for (let k = 0; k < 4; k++) {
    const isQ = k === q;
    c.rect(tx[k] - 1.5, ty - 1, 4, 4, isQ ? "v" : "j", c.nextPart());
    c.set(tx[k] - 1.5, ty - 1, isQ ? "z" : "l", c.nextPart());
    // weight pips under each token (count ~ weight): the row also reads as a bar chart
    const hgt = Math.max(1, Math.round(wts[k] * 5));
    for (let yy = 0; yy < hgt; yy++) c.set(tx[k] + 0.5 - (yy % 2), ty + 4 + Math.floor(yy / 2), isQ ? "v" : "n");
  }

  // front legs + paws
  const lift = p.paw;
  c.ellipse(cx - 8 * S, ground - 4 - lift * 4, 4.6, 6.5, FUR, { part: c.nextPart() });
  c.ellipse(cx + 8 * S, ground - 4, 4.6, 6.5, FUR, { part: c.nextPart() });
  c.ellipse(cx - 8 * S, ground - 1.2 - lift * 5, 5.2, 3, BELLY, { part: c.nextPart() });
  c.ellipse(cx + 8 * S, ground - 1.2, 5.2, 3, BELLY, { part: c.nextPart() });
  for (const sx of [-8 * S, 8 * S]) {
    const yy = ground - 1 - (sx < 0 ? lift * 5 : 0);
    c.set(cx + sx - 1, yy, "e", c.nextPart());
    c.set(cx + sx + 2, yy, "e", c.nextPart());
  }

  // head
  const hx = cx + p.hx;
  const hy = by - 18 + p.hy + p.squash * 1.2;
  const e = p.ear;
  for (const sgn of [-1, 1]) {
    // taller, swept ears with a key node (cyan) at each tip
    const ex = hx + sgn * 13.5 * S;
    const ey = hy - 4 - e;
    c.ellipse(ex, ey, 4.8, 10, FUR, { angle: sgn * 0.38, part: c.nextPart() });
    c.ellipse(ex - sgn * 0.5, ey + 1.5, 2.4, 6, ["e", "f", "g"], { angle: sgn * 0.38, part: c.nextPart() });
    const nx = ex + sgn * 3;
    const ny = ey - 9;
    c.ellipse(nx, ny, 2.8, 2.8, ["j", "j", "l", "l"], { bias: 0.1, part: c.nextPart() });
    c.set(nx - 1, ny - 1, "w", c.nextPart());
  }
  c.ellipse(hx, hy, 15 * S, 13 * S, FUR, { part: c.nextPart() });
  c.ellipse(hx, hy + 6, 8 * S, 5.5 * S, BELLY, { part: c.nextPart() });

  // three-head crest: a fan of gems; the lit one cycles (multi-head attention)
  const lit = p.glow % 3;
  const gems = [[-5, -9], [0, -12], [5, -9]];
  gems.forEach(([dx, dy], i) => {
    const gx = hx + dx;
    const gy = hy + dy;
    c.ellipse(gx, gy, 2.4, 2.8, i === lit ? GOLD : ["m", "m", "n", "n"], { bias: i === lit ? 0.2 : 0, part: c.nextPart() });
    c.set(gx - 1, gy - 1, i === lit ? "p" : "o", c.nextPart());
  });
  // a gold band joining the heads (their outputs concatenate)
  c.line(hx - 4, hy - 7, hx + 4, hy - 7, "n", c.nextPart());

  // eyes
  const ey = hy - 1;
  for (const sgn of [-1, 1]) {
    const ex = hx + sgn * 7 * S;
    const l = sgn < 0;
    if (p.eye === "open" || p.eye === "focus") {
      c.disc(ex, ey, 4.4, 5.4, "k");
      c.disc(ex, ey, 3.6, 4.6, "w");
      c.disc(ex + (p.eye === "focus" ? -sgn * 0.5 : 0), ey + 0.5, 2.5, 3.4, "i");
      c.disc(ex + (p.eye === "focus" ? -sgn * 0.5 : 0), ey + 2, 1.7, 1.5, "s");
      c.disc(ex - 1, ey - 1.5, 1, 1, "w");
      if (p.eye === "focus") c.line(ex - 4, ey - 6 + (l ? 1 : 0), ex + 4, ey - 6 + (l ? 0 : 1), "k");
    } else if (p.eye === "blink") {
      c.line(ex - 3, ey + 1, ex + 3, ey + 1, "k");
      c.line(ex - 3, ey + 2, ex + 3, ey + 2, "a");
    } else if (p.eye === "hurt") {
      c.line(ex - 3 * sgn, ey - 3, ex + 2 * sgn, ey, "k");
      c.line(ex - 3 * sgn, ey + 3, ex + 2 * sgn, ey, "k");
      c.line(ex - 3 * sgn, ey - 4, ex + 1 * sgn, ey - 1, "k");
    } else if (p.eye === "dead") {
      c.line(ex - 3, ey - 3, ex + 3, ey + 3, "x");
      c.line(ex - 3, ey + 3, ex + 3, ey - 3, "x");
    }
    if (p.eye !== "dead") c.disc(ex + sgn * 2.5, ey + 6, 2.2, 1.4, "r");
  }
  // nose + mouth
  c.ellipse(hx, hy + 4.5, 2.6, 1.8, ["k", "k", "a"], { part: c.nextPart() });
  c.set(hx - 1, hy + 3.5, "w", c.nextPart());
  if (p.mouth === 1) {
    c.line(hx - 4, hy + 8, hx - 2, hy + 9, "k");
    c.line(hx - 1, hy + 9, hx + 1, hy + 9, "k");
    c.line(hx + 2, hy + 9, hx + 4, hy + 8, "k");
    c.set(hx, hy + 7, "k");
  } else if (p.mouth === 2) {
    c.ellipse(hx, hy + 9.5, 4.2, 3.4, ["k", "k", "t"], { bias: 0.3, part: c.nextPart() });
    c.disc(hx, hy + 11, 2.4, 1.3, "r");
    c.set(hx - 3, hy + 7, "w");
    c.set(hx + 3, hy + 7, "w");
  } else {
    c.line(hx - 3, hy + 8, hx - 1, hy + 9, "k");
    c.line(hx, hy + 9, hx + 3, hy + 8, "k");
    c.set(hx, hy + 7, "k");
  }
  if (p.eye === "dead") c.disc(hx + 3, hy + 11, 2.2, 1.6, "r");

  // attack: a gold "context" orb with three beams converging on it (heads combining)
  if (p.orb) {
    const ox = hx;
    const oy = hy + 21;
    const r = p.orb;
    c.ellipse(ox, oy, r, r, GOLD, { bias: 0.3, part: c.nextPart() });
    c.disc(ox - r * 0.3, oy - r * 0.3, Math.max(1, r * 0.3), Math.max(1, r * 0.3), "p");
    for (let a = 0; a < 8; a++) {
      const t = (a / 8) * Math.PI * 2 + p.orb;
      c.set(ox + Math.cos(t) * (r + 3), oy + Math.sin(t) * (r + 3), a % 2 ? "o" : "y");
    }
  }

  c.outline("k", "a", SKIP);
  return c.rows();
}

function drawBack(p) {
  const c = new Canvas(W, H);
  const cx = 32 + p.bx;
  const by = 43 + p.by;
  const ground = 58;
  const S = p.scale;
  const sq = 1 - p.squash * 0.1;

  c.ellipse(cx - 15 * S, ground - 6, 7, 6.5, FUR, { part: c.nextPart() });
  c.ellipse(cx + 15 * S, ground - 6, 7, 6.5, FUR, { part: c.nextPart() });
  c.ellipse(cx - 13 * S, ground - 1.5, 6, 3.2, FUR, { bias: 0.1, part: c.nextPart() });
  c.ellipse(cx + 13 * S, ground - 1.5, 6, 3.2, FUR, { bias: 0.1, part: c.nextPart() });
  c.ellipse(cx, by, 16 * S, 15 * sq * S, FUR, { part: c.nextPart() });

  // dorsal stack: three blocks (layers); a gold residual line runs down past every block
  // and the active block lights in turn, like activations moving up the stack
  const active = p.glow % 3;
  for (let i = 0; i < 3; i++) {
    const yy = by - 3 + i * 5;
    const col = i === active ? CORAL : ["j", "j", "l", "l"];
    c.ellipse(cx - 1, yy, 4.2, 2.4, col, { bias: 0.1, part: c.nextPart() });
    c.set(cx - 3, yy - 1, i === active ? "z" : "w", c.nextPart());
  }
  for (let yy = by - 6; yy <= by + 10; yy++) c.set(cx + 5, yy, "o");
  for (let i = 0; i < 3; i++) {
    const yy = by - 3 + i * 5;
    c.set(cx + 4, yy, "n"); // the block's output joins the stream (the "+")
    c.set(cx + 6, yy, "n");
  }

  // tail: segmented, with the ribbon along its outer edge
  const swing = p.tail * 4;
  const tp = c.nextPart();
  const pts = [
    [cx + 6, by + 10],
    [cx + 12, by + 7],
    [cx + 17 + swing * 0.4, by + 1],
    [cx + 18 + swing, by - 6],
  ];
  pts.forEach(([x, y], i) => c.ellipse(x, y, 3.8 - i * 0.4, 3.8 - i * 0.4, FUR, { part: tp }));
  for (let k = 0; k < 3; k++) c.line(pts[k][0] + 3, pts[k][1] - 1, pts[k + 1][0] + 3, pts[k + 1][1] - 1, "o");
  c.ellipse(pts[3][0] + 1, pts[3][1] - 4, 4, 4, GOLD, { bias: 0.1 + p.glow * 0.05, part: c.nextPart() });
  c.disc(pts[3][0], pts[3][1] - 5, 1, 1, "p");

  // head (back)
  const hx = cx + p.hx;
  const hy = by - 20 + p.hy;
  for (const sgn of [-1, 1]) {
    const ex = hx + sgn * 13.5 * S;
    const ey = hy - 4 - p.ear;
    c.ellipse(ex, ey, 4.8, 10, FUR, { angle: sgn * 0.38, part: c.nextPart() });
    c.ellipse(ex + sgn * 0.5, ey + 1, 2.2, 5.5, ["a", "b", "c"], { angle: sgn * 0.38, part: c.nextPart() });
    const nx = ex + sgn * 3;
    const ny = ey - 9;
    c.ellipse(nx, ny, 2.8, 2.8, ["j", "j", "l", "l"], { bias: 0.1, part: c.nextPart() });
    c.set(nx - 1, ny - 1, "w", c.nextPart());
  }
  c.ellipse(hx, hy, 15 * S, 13 * S, FUR, { part: c.nextPart() });
  // the backs of the three crest gems poke over the skull
  const lit = p.glow % 3;
  [[-5, -11], [0, -13], [5, -11]].forEach(([dx, dy], i) => {
    c.ellipse(hx + dx, hy + dy, 2.2, 2.2, i === lit ? GOLD : ["m", "m", "n", "n"], { part: c.nextPart() });
  });
  c.line(hx, hy - 6, hx, hy + 5, "b");
  if (p.eye === "dead") {
    c.line(hx - 4, hy - 1, hx + 4, hy + 5, "x");
    c.line(hx - 4, hy + 5, hx + 4, hy - 1, "x");
  }
  if (p.orb) {
    const ox = hx;
    const oy = hy - 23;
    c.ellipse(ox, oy, p.orb, p.orb, GOLD, { bias: 0.3, part: c.nextPart() });
  }
  c.outline("k", "a", SKIP);
  return c.rows();
}

const P = (o) => ({ ...base, ...o });

function front() {
  return {
    idle: [
      P({ tail: -0.5, mouth: 1, glow: 0 }),
      P({ hy: 1, tail: 0, mouth: 1, glow: 1 }),
      P({ by: 1, hy: 1, tail: 0.5, mouth: 1, glow: 2, ear: -1 }),
      P({ tail: 0, eye: "blink", mouth: 1, glow: 3 }),
    ].map(drawFront),
    attack: [
      P({ by: 2, hy: 1, squash: 1.5, eye: "focus", glow: 0, ear: -1, tail: 0.4 }),
      P({ by: 2, hy: 2, squash: 2, eye: "focus", mouth: 2, glow: 1, orb: 2, ear: -2 }),
      P({ scale: 1.04, eye: "focus", mouth: 2, glow: 2, orb: 4, ear: 2, paw: 1 }),
      P({ by: -1, hy: -1, scale: 1.06, eye: "focus", mouth: 2, glow: 3, orb: 5, ear: 3, paw: 1, tail: -0.7 }),
      P({ eye: "open", mouth: 1, glow: 0 }),
    ].map(drawFront),
    hurt: [
      P({ bx: -2, by: 1, squash: 1, eye: "hurt", mouth: 2, ear: -2, tail: 0.8 }),
      P({ bx: 2, squash: 0.5, eye: "hurt", mouth: 2, ear: -2, tail: -0.6 }),
      P({ by: 1, squash: 1, eye: "hurt", ear: -1 }),
    ].map(drawFront),
    faint: [
      P({ by: 2, squash: 2, eye: "hurt", mouth: 2, ear: -2 }),
      P({ by: 5, squash: 3.5, eye: "dead", mouth: 2, ear: -3, hy: 2 }),
      P({ by: 7, squash: 5, eye: "dead", mouth: 2, ear: -3, hy: 3 }),
      P({ by: 8, squash: 6, eye: "dead", mouth: 2, ear: -4, hy: 4 }),
    ].map(drawFront),
    evolve: [
      P({ aura: 1, glow: 0, eye: "focus" }),
      P({ aura: 2, glow: 1, eye: "focus", mouth: 1, ear: 2 }),
      P({ aura: 3, glow: 2, eye: "focus", mouth: 1, ear: 3, scale: 1.03 }),
      P({ aura: 2, glow: 3, mouth: 1, ear: 1 }),
    ].map(drawFront),
  };
}

function back() {
  return {
    idle: [P({ tail: -0.5 }), P({ hy: 1, glow: 1 }), P({ by: 1, hy: 1, tail: 0.5, glow: 2, ear: -1 }), P({ glow: 0 })].map(drawBack),
    attack: [
      P({ by: 2, squash: 2, ear: -2 }),
      P({ by: -2, scale: 1.04, ear: 2, glow: 2, orb: 3, tail: 0.8 }),
      P({ glow: 1 }),
    ].map(drawBack),
    hurt: [P({ bx: 2, squash: 1, ear: -2, tail: 0.8 }), P({ bx: -2, squash: 0.5, ear: -2 })].map(drawBack),
    faint: [P({ by: 3, squash: 2.5, ear: -2 }), P({ by: 6, squash: 4.5, ear: -3, eye: "dead" }), P({ by: 8, squash: 6, ear: -4, eye: "dead" })].map(drawBack),
  };
}

if (process.argv[1] && process.argv[1].endsWith("neuron-pup-transformer.mjs")) {
  const out = "game/sprites/creatures/";
  writeFileSync(
    out + "neuron-pup-transformer.ts",
    toModule({
      id: "neuron-pup-transformer",
      name: "NEURON-PUP",
      doc: "Neuron-Pup, Transformer form. Front view, 64×64. Midnight-sapphire fur; the belly is a row of four tokens with gold arcs from the coral query token whose thickness is a real softmax weight (the query moves each frame); a three-gem crest (three heads) and a tail of stacked blocks with a gold residual ribbon skipping over them.",
      exportName: "NEURON_PUP_TRANSFORMER",
      w: W,
      h: H,
      palette,
      fps: { idle: 4, attack: 7, hurt: 8, faint: 5, evolve: 5 },
      anims: front(),
      generator: "scripts/art/neuron-pup-transformer.mjs",
    }),
  );
  writeFileSync(
    out + "neuron-pup-transformer-back.ts",
    toModule({
      id: "neuron-pup-transformer-back",
      name: "NEURON-PUP",
      doc: "Neuron-Pup, Transformer form. Back view (player's side in battle), 64×64. A dorsal stack of three blocks with a gold residual line running past each.",
      exportName: "NEURON_PUP_TRANSFORMER_BACK",
      w: W,
      h: H,
      palette,
      fps: { idle: 4, attack: 7, hurt: 8, faint: 5 },
      anims: back(),
      generator: "scripts/art/neuron-pup-transformer.mjs",
    }),
  );
  console.log("wrote neuron-pup transformer sprites");
}
