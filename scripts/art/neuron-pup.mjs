// Generates game/sprites/creatures/neuron-pup-perceptron{,-back}.ts
// Neuron-Pup, Perceptron form: an indigo pup whose big ears are input nodes,
// whose chest shows a 3-input perceptron (inputs -> weighted sum -> output),
// and whose tail ends in a glowing bias knob. Original design.
import { writeFileSync } from "node:fs";
import { Canvas, toModule } from "./raster.mjs";

const W = 64;
const H = 64;

const palette = {
  k: "#150f26", // outline
  // indigo fur ramp (dark -> light)
  a: "#2a2459",
  b: "#4338a0",
  c: "#6a5ce0",
  d: "#a79bff",
  // warm cream belly ramp
  e: "#b38a6e",
  f: "#d9b494",
  g: "#f2d8b8",
  h: "#fff1dc",
  // cyan "signal" ramp
  m: "#0b6e7a",
  n: "#12b3c4",
  o: "#6df0f7",
  p: "#e6fffe",
  // face
  w: "#ffffff",
  i: "#1a1236", // pupil
  s: "#8fe9ff", // iris tint
  r: "#ff7aa8", // tongue / cheek
  t: "#c24a78",
  x: "#ff4f6d", // KO marks
  q: "#b9fbff", // evolve aura
};
const FUR = ["a", "b", "c", "d"];
const BELLY = ["e", "f", "g", "h"];
const SIG = ["m", "n", "o", "p"];
const SKIP = new Set(["q", "p"]);

/** Pose parameters; every animation frame is one of these. */
const base = {
  bx: 0, by: 0, // body offset
  hx: 0, hy: 0, // head offset (relative to body)
  squash: 0, // >0 flattens the body, <0 stretches
  tail: 0, // -1..1 swing
  eye: "open", // open | blink | hurt | dead | focus
  mouth: 0, // 0 closed, 1 smile, 2 open
  ear: 0, // ear lift
  glow: 0, // 0..3 signal intensity
  scale: 1, // lunge toward the viewer
  aura: 0, // evolve rings
  orb: 0, // attack bolt size
  paw: 0, // front paw lift (attack)
};

function drawFront(p) {
  const c = new Canvas(W, H);
  const cx = 32 + p.bx;
  const S = p.scale;
  const sq = 1 - p.squash * 0.1;
  const by = 41 + p.by;
  const ground = 57 + p.by * 0; // feet stay planted unless the whole body moves

  if (p.aura) {
    for (let k = 0; k < p.aura; k++) {
      const rr = 18 + k * 7;
      for (let a = 0; a < 360; a += 4) {
        const t = (a * Math.PI) / 180;
        const x = 32 + Math.cos(t) * (rr + 6);
        const y = 34 + Math.sin(t) * rr;
        if (k % 2 === 0 || a % 8 === 0) c.set(x, y, "q", c.nextPart());
      }
    }
  }

  // tail (behind everything): a curl of beads ending in the bias knob
  const tailPart = c.nextPart();
  const tx0 = cx + 12 * S;
  const ty0 = by + 5;
  const swing = p.tail * 5;
  const pts = [
    [tx0, ty0],
    [tx0 + 4, ty0 - 2 - swing * 0.2],
    [tx0 + 7 + swing * 0.3, ty0 - 7],
    [tx0 + 7 + swing * 0.8, ty0 - 13],
  ];
  pts.forEach(([x, y], i) => c.ellipse(x, y, 3.4 - i * 0.35, 3.4 - i * 0.35, FUR, { part: tailPart }));
  const kx = pts[3][0] + 1;
  const ky = pts[3][1] - 4;
  c.ellipse(kx, ky, 4.2, 4.2, SIG, { bias: p.glow * 0.1, part: c.nextPart() });
  c.disc(kx - 1, ky - 1, 1, 1, "p");

  // back haunches
  c.ellipse(cx - 16 * S, ground - 7, 6.5, 6, FUR, { part: c.nextPart() });
  c.ellipse(cx + 16 * S, ground - 7, 6.5, 6, FUR, { part: c.nextPart() });
  // hind feet
  c.ellipse(cx - 14 * S, ground - 1.5, 6, 3.2, FUR, { bias: 0.1, part: c.nextPart() });
  c.ellipse(cx + 14 * S, ground - 1.5, 6, 3.2, FUR, { bias: 0.1, part: c.nextPart() });

  // body
  const body = c.ellipse(cx, by + 3, 15 * S, 14 * sq * S, FUR, { part: c.nextPart() });
  // belly
  const belly = c.ellipse(cx, by + 6, 9 * S, 10 * sq * S, BELLY, { part: c.nextPart() });
  // perceptron on the belly: three inputs -> weighted sum -> output
  const gx = cx;
  const gy = by + 6;
  const ins = [[-5, -4], [-5, 1], [-5, 6]];
  const wcol = ["o", "n", "o"];
  ins.forEach(([dx, dy], i) => {
    c.line(gx + dx + 1, gy + dy, gx + 3, gy + 1, wcol[i], c.nextPart());
  });
  ins.forEach(([dx, dy]) => {
    c.disc(gx + dx, gy + dy, 1.9, 1.9, "k");
    c.disc(gx + dx, gy + dy, 1.3, 1.3, "n");
    c.set(gx + dx - 1, gy + dy - 1, "p", c.nextPart());
  });
  c.ellipse(gx + 4, gy + 1, 3.2, 3.2, SIG, { bias: 0.15 + p.glow * 0.2, part: c.nextPart() });
  c.disc(gx + 3, gy, 0.9, 0.9, "p");

  // front legs + paws
  const lift = p.paw;
  c.ellipse(cx - 8 * S, ground - 4 - lift * 4, 4.6, 6.5, FUR, { part: c.nextPart() });
  c.ellipse(cx + 8 * S, ground - 4, 4.6, 6.5, FUR, { part: c.nextPart() });
  c.ellipse(cx - 8 * S, ground - 1.2 - lift * 5, 5.2, 3, BELLY, { part: c.nextPart() });
  c.ellipse(cx + 8 * S, ground - 1.2, 5.2, 3, BELLY, { part: c.nextPart() });
  // toe lines
  for (const sx of [-8 * S, 8 * S]) {
    const yy = ground - 1 - (sx < 0 ? lift * 5 : 0);
    c.set(cx + sx - 1, yy, "e", c.nextPart());
    c.set(cx + sx + 2, yy, "e", c.nextPart());
  }

  // head
  const hx = cx + p.hx;
  const hy = by - 17 + p.hy + p.squash * 1.2;
  // ears first (they sit behind the head): rounded, with a cyan input node at each tip
  const e = p.ear;
  for (const sgn of [-1, 1]) {
    const ex = hx + sgn * 14 * S;
    const ey = hy - 3 - e;
    c.ellipse(ex, ey, 5.2, 9, FUR, { angle: sgn * 0.45, part: c.nextPart() });
    c.ellipse(ex - sgn * 0.5, ey + 1.5, 2.6, 5.5, ["e", "f", "g"], { angle: sgn * 0.45, part: c.nextPart() });
    const nx = ex + sgn * 2;
    const ny = ey - 8;
    c.ellipse(nx, ny, 3, 3, SIG, { bias: p.glow * 0.1 - 0.1, part: c.nextPart() });
    c.disc(nx - 0.5, ny - 0.5, 0.8, 0.8, "p");
  }
  c.ellipse(hx, hy, 15 * S, 13 * S, FUR, { part: c.nextPart() });
  // muzzle
  c.ellipse(hx, hy + 6, 8 * S, 5.5 * S, BELLY, { part: c.nextPart() });
  // forehead sigma-diamond
  const fx = hx;
  const fy = hy - 8;
  const d = c.nextPart();
  [[0, -3], [-1, -2], [0, -2], [1, -2], [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1], [-1, 0], [0, 0], [1, 0], [0, 1]].forEach(([dx, dy]) =>
    c.set(fx + dx, fy + dy + 2, dx === 0 && dy === -1 ? "p" : dy < 0 ? "o" : "n", d),
  );

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
      // > < squint
      c.line(ex - 3 * sgn, ey - 3, ex + 2 * sgn, ey, "k");
      c.line(ex - 3 * sgn, ey + 3, ex + 2 * sgn, ey, "k");
      c.line(ex - 3 * sgn, ey - 4, ex + 1 * sgn, ey - 1, "k");
    } else if (p.eye === "dead") {
      c.line(ex - 3, ey - 3, ex + 3, ey + 3, "x");
      c.line(ex - 3, ey + 3, ex + 3, ey - 3, "x");
    }
    // cheek blush
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
  if (p.eye === "dead") {
    c.disc(hx + 3, hy + 11, 2.2, 1.6, "r");
  }

  // attack bolt: a small perceptron "signal" orb in front of the muzzle
  if (p.orb) {
    const ox = hx;
    const oy = hy + 20;
    const r = p.orb;
    c.ellipse(ox, oy, r, r, SIG, { bias: 0.3, part: c.nextPart() });
    c.disc(ox - r * 0.3, oy - r * 0.3, Math.max(1, r * 0.3), Math.max(1, r * 0.3), "p");
    for (let a = 0; a < 6; a++) {
      const t = (a / 6) * Math.PI * 2 + p.orb;
      c.set(ox + Math.cos(t) * (r + 3), oy + Math.sin(t) * (r + 3), "o");
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

  // haunches / feet
  c.ellipse(cx - 15 * S, ground - 6, 7, 6.5, FUR, { part: c.nextPart() });
  c.ellipse(cx + 15 * S, ground - 6, 7, 6.5, FUR, { part: c.nextPart() });
  c.ellipse(cx - 13 * S, ground - 1.5, 6, 3.2, FUR, { bias: 0.1, part: c.nextPart() });
  c.ellipse(cx + 13 * S, ground - 1.5, 6, 3.2, FUR, { bias: 0.1, part: c.nextPart() });
  // body
  c.ellipse(cx, by, 16 * S, 14 * sq * S, FUR, { part: c.nextPart() });
  // dorsal stripe with three weight nodes
  for (let i = 0; i < 3; i++) {
    const yy = by - 7 + i * 6;
    c.ellipse(cx, yy, 3.2, 2.8, SIG, { bias: 0.1 + p.glow * 0.15, part: c.nextPart() });
    c.set(cx - 1, yy - 1, "p", c.nextPart());
    if (i < 2) c.line(cx, yy + 3, cx, yy + 4, "m", c.nextPart());
  }
  // tail: big, towards the viewer's right
  const swing = p.tail * 4;
  const tp = c.nextPart();
  const pts = [
    [cx + 6, by + 10],
    [cx + 12, by + 7],
    [cx + 17 + swing * 0.4, by + 1],
    [cx + 18 + swing, by - 6],
  ];
  pts.forEach(([x, y], i) => c.ellipse(x, y, 3.8 - i * 0.4, 3.8 - i * 0.4, FUR, { part: tp }));
  c.ellipse(pts[3][0] + 1, pts[3][1] - 4, 4.4, 4.4, SIG, { bias: p.glow * 0.1, part: c.nextPart() });
  c.disc(pts[3][0], pts[3][1] - 5, 1, 1, "p");

  // head (back): ears, then a round skull with a parting line
  const hx = cx + p.hx;
  const hy = by - 19 + p.hy;
  for (const sgn of [-1, 1]) {
    const ex = hx + sgn * 14 * S;
    const ey = hy - 3 - p.ear;
    c.ellipse(ex, ey, 5.2, 9, FUR, { angle: sgn * 0.45, part: c.nextPart() });
    c.ellipse(ex + sgn * 0.5, ey + 1, 2.4, 5, ["a", "b", "c"], { angle: sgn * 0.45, part: c.nextPart() });
    const nx = ex + sgn * 2;
    const ny = ey - 8;
    c.ellipse(nx, ny, 3, 3, SIG, { bias: p.glow * 0.1 - 0.1, part: c.nextPart() });
    c.disc(nx - 0.5, ny - 0.5, 0.8, 0.8, "p");
  }
  c.ellipse(hx, hy, 15 * S, 13 * S, FUR, { part: c.nextPart() });
  // nape tuft + sigma mark
  c.line(hx, hy - 6, hx, hy + 5, "b");
  [[0, 0], [-1, 1], [1, 1], [-2, 2], [2, 2]].forEach(([dx, dy]) => c.set(hx + dx, hy - 9 + dy, dy === 0 ? "p" : "o"));
  if (p.eye === "dead") {
    c.line(hx - 4, hy - 1, hx + 4, hy + 5, "x");
    c.line(hx - 4, hy + 5, hx + 4, hy - 1, "x");
  }
  if (p.orb) {
    const ox = hx;
    const oy = hy - 22;
    c.ellipse(ox, oy, p.orb, p.orb, SIG, { bias: 0.3, part: c.nextPart() });
  }
  c.outline("k", "a", SKIP);
  return c.rows();
}

const P = (o) => ({ ...base, ...o });

function front() {
  return {
    idle: [
      P({ by: 0, tail: -0.5, mouth: 1, glow: 0 }),
      P({ by: 0, hy: 1, tail: 0, mouth: 1, glow: 1, ear: 0 }),
      P({ by: 1, hy: 1, tail: 0.5, mouth: 1, glow: 2, ear: -1 }),
      P({ by: 0, hy: 0, tail: 0, eye: "blink", mouth: 1, glow: 1 }),
    ].map(drawFront),
    attack: [
      P({ by: 2, hy: 1, squash: 1.5, eye: "focus", mouth: 0, glow: 1, ear: -1, tail: 0.4 }),
      P({ by: 2, hy: 2, squash: 2, eye: "focus", mouth: 2, glow: 2, orb: 2, ear: -2 }),
      P({ by: 0, hy: 0, scale: 1.04, eye: "focus", mouth: 2, glow: 3, orb: 4, ear: 2, paw: 1 }),
      P({ by: -1, hy: -1, scale: 1.06, eye: "focus", mouth: 2, glow: 3, orb: 5, ear: 3, paw: 1, tail: -0.7 }),
      P({ by: 0, eye: "open", mouth: 1, glow: 1 }),
    ].map(drawFront),
    hurt: [
      P({ bx: -2, by: 1, squash: 1, eye: "hurt", mouth: 2, ear: -2, tail: 0.8 }),
      P({ bx: 2, by: 0, squash: 0.5, eye: "hurt", mouth: 2, ear: -2, tail: -0.6 }),
      P({ bx: 0, by: 1, squash: 1, eye: "hurt", mouth: 0, ear: -1 }),
    ].map(drawFront),
    faint: [
      P({ by: 2, squash: 2, eye: "hurt", mouth: 2, ear: -2 }),
      P({ by: 5, squash: 3.5, eye: "dead", mouth: 2, ear: -3, glow: 0, hy: 2 }),
      P({ by: 7, squash: 5, eye: "dead", mouth: 2, ear: -3, hy: 3 }),
      P({ by: 8, squash: 6, eye: "dead", mouth: 2, ear: -4, hy: 4 }),
    ].map(drawFront),
    evolve: [
      P({ aura: 1, glow: 1, eye: "focus", mouth: 0 }),
      P({ aura: 2, glow: 2, eye: "focus", mouth: 1, ear: 2 }),
      P({ aura: 3, glow: 3, eye: "focus", mouth: 1, ear: 3, scale: 1.03 }),
      P({ aura: 2, glow: 3, eye: "open", mouth: 1, ear: 1 }),
    ].map(drawFront),
  };
}

function back() {
  return {
    idle: [
      P({ tail: -0.5 }),
      P({ hy: 1, glow: 1 }),
      P({ by: 1, hy: 1, tail: 0.5, glow: 2, ear: -1 }),
      P({ glow: 1 }),
    ].map(drawBack),
    attack: [
      P({ by: 2, squash: 2, ear: -2 }),
      P({ by: -2, scale: 1.04, ear: 2, glow: 3, orb: 3, tail: 0.8 }),
      P({ by: 0, glow: 1 }),
    ].map(drawBack),
    hurt: [P({ bx: 2, squash: 1, ear: -2, tail: 0.8 }), P({ bx: -2, squash: 0.5, ear: -2 })].map(drawBack),
    faint: [P({ by: 3, squash: 2.5, ear: -2 }), P({ by: 6, squash: 4.5, ear: -3, eye: "dead" }), P({ by: 8, squash: 6, ear: -4, eye: "dead" })].map(drawBack),
  };
}

const out = "game/sprites/creatures/";
writeFileSync(
  out + "neuron-pup-perceptron.ts",
  toModule({
    id: "neuron-pup-perceptron",
    name: "NEURON-PUP",
    doc: "Neuron-Pup, Perceptron form. Front view, 64×64. Ears are input nodes, the chest shows a 3-input perceptron, the tail ends in the bias knob.",
    exportName: "NEURON_PUP_PERCEPTRON",
    w: W,
    h: H,
    palette,
    fps: { idle: 4, attack: 7, hurt: 8, faint: 5, evolve: 5 },
    anims: front(),
    generator: "scripts/art/neuron-pup.mjs",
  }),
);
writeFileSync(
  out + "neuron-pup-perceptron-back.ts",
  toModule({
    id: "neuron-pup-perceptron-back",
    name: "NEURON-PUP",
    doc: "Neuron-Pup, Perceptron form. Back view (player's side in battle), 64×64.",
    exportName: "NEURON_PUP_PERCEPTRON_BACK",
    w: W,
    h: H,
    palette,
    fps: { idle: 4, attack: 7, hurt: 8, faint: 5 },
    anims: back(),
    generator: "scripts/art/neuron-pup.mjs",
  }),
);
console.log("wrote neuron-pup sprites");
