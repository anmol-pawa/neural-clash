// Generates game/sprites/creatures/warden-indent.ts
// Warden Indent, the Python Port guardian: a coiled serpent whose three coils
// are indented one step further each (Python's whitespace rule), with a hood,
// a forked tongue and four floating "space" blocks. Original design, 96x96.
import { writeFileSync } from "node:fs";
import { Canvas, toModule } from "./raster.mjs";

const W = 96;
const H = 96;

const palette = {
  k: "#0e1b1a", // outline
  i: "#1c4a3f", // inner contour
  a: "#1f5a45", b: "#2f8a58", c: "#58c06a", d: "#a6ee86", // scale ramp
  p: "#5a3a20", q: "#8a5a30", r: "#c58a4c", s: "#f0c47a", // belly / hood ramp
  y: "#ffd24a", // eye iris / space blocks
  o: "#f0a020",
  w: "#ffffff",
  t: "#e83a5e", // tongue
  e: "#101010", // pupil
  g: "#bfe9ff", // glow
  x: "#ff4f6d", // KO marks
};
const SCALE = ["a", "b", "c", "d"];
const BELLY = ["p", "q", "r", "s"];
const SKIP = new Set(["g", "y", "o"]);

const base = { dx: 0, dy: 0, sway: 0, eye: "open", mouth: 0, tongue: 0, lunge: 0, squash: 0, blocks: 0, bolt: 0, flash: 0 };

function coil(c, cx, cy, rx, ry, indent) {
  const part = c.ellipse(cx, cy, rx, ry, SCALE);
  // belly band on the front, and scale-diamond decals
  c.decal((keep) => {
    for (let x = Math.round(cx - rx); x <= cx + rx; x++) {
      for (let y = Math.round(cy + ry * 0.25); y <= cy + ry; y++) {
        const u = (x + 0.5 - cx) / rx;
        const v = (y + 0.5 - cy) / ry;
        if (u * u + v * v <= 1 && keep(x, y)) c.set(x, y, v > 0.62 ? BELLY[1] : BELLY[2], part);
      }
    }
    for (let k = -3; k <= 3; k++) {
      const x = Math.round(cx + k * (rx / 3.4));
      const y = Math.round(cy - ry * 0.3 + (Math.abs(k) % 2) * 3);
      for (const [ox, oy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) if (keep(x + ox, y + oy)) c.set(x + ox, y + oy, k % 2 ? "a" : "b", part);
      if (keep(x, y)) c.set(x, y, "d", part);
    }
  }, part);
  // indent mark: a small cut on the left edge showing the step
  c.rect(Math.round(cx - rx - 1 + indent), Math.round(cy + ry * 0.2), 2, 2, "i");
  return part;
}

function draw(p) {
  const c = new Canvas(W, H);
  const sq = p.squash;
  const baseY = 88 + p.dy * 0.5;

  // coil 3 (bottom, widest, leftmost), coil 2, coil 1 (top, most indented to the right)
  coil(c, 40 + p.dx * 0.2, baseY - 8 + sq * 0.5, 31, 11 - sq * 0.3, 0);
  coil(c, 46 + p.dx * 0.3, baseY - 22 + sq, 26, 10 - sq * 0.3, 6);
  coil(c, 52 + p.dx * 0.5, baseY - 35 + sq * 1.4, 21, 9 - sq * 0.3, 12);

  // tail tip curling out of the base coil on the right
  c.ellipse(76 + p.dx * 0.2, baseY - 5 + sq * 0.5, 7, 4, SCALE);
  c.ellipse(84 + p.dx * 0.2, baseY - 9 + sq * 0.5, 4, 3, SCALE);

  // neck: a column of overlapping segments swaying and leaning (lunge pushes the head forward-left)
  const topY = baseY - 38 + sq * 2;
  const segs = 7;
  let hx = 52;
  let hy = topY;
  for (let k = 0; k < segs; k++) {
    const t = k / (segs - 1);
    const x = 52 + p.dx + Math.sin(t * 2.1 + p.sway) * 3 - p.lunge * t * 18;
    const y = topY - t * (28 - sq * 2) + p.lunge * t * t * 10 + p.dy * t;
    c.ellipse(x, y, 8 - t * 1.5, 7, SCALE, { bias: -0.05 });
    // belly strip on the neck front
    c.decal((keep) => {
      for (let j = 0; j < 4; j++) if (keep(Math.round(x - 3 + j), Math.round(y + 3))) c.set(Math.round(x - 3 + j), Math.round(y + 3), BELLY[2]);
    }, c.order - 1);
    hx = x;
    hy = y;
  }

  // hood: broad ellipse behind the head with a warm underside and a pattern
  const hoodPart = c.ellipse(hx, hy - 3, 17, 14, BELLY, { bias: 0.1 });
  c.decal((keep) => {
    for (let k = -2; k <= 2; k++) {
      const x = Math.round(hx + k * 5);
      for (let y = Math.round(hy - 12); y <= hy + 8; y += 4) if (keep(x, y)) c.set(x, y, k % 2 ? "p" : "q", hoodPart);
    }
  }, hoodPart);

  // head
  const headPart = c.ellipse(hx - p.lunge * 3, hy - 6 + (p.eye === "dead" ? 3 : 0), 12, 9, SCALE, { bias: 0.08 });
  const hy0 = Math.round(hy - 6 + (p.eye === "dead" ? 3 : 0));
  const hx0 = Math.round(hx - p.lunge * 3);

  // snout/jaw
  const jaw = p.mouth ? 4 : 1;
  c.ellipse(hx0 - 4, hy0 + 5 + jaw, 9, 3.5, SCALE, { bias: 0.1 });

  // eyes
  for (const sgn of [-1, 1]) {
    const ex = hx0 + sgn * 6;
    const ey = hy0 - 2;
    if (p.eye === "dead") {
      c.line(ex - 2, ey - 2, ex + 2, ey + 2, "x");
      c.line(ex - 2, ey + 2, ex + 2, ey - 2, "x");
    } else if (p.eye === "blink") {
      c.rect(ex - 3, ey, 6, 1, "k");
    } else {
      const ry = p.eye === "focus" ? 2 : 3;
      c.disc(ex, ey, 3.5, ry + 1, "w");
      c.disc(ex - sgn * 0.5, ey, 2, ry, p.eye === "hurt" ? "t" : "y");
      c.disc(ex - sgn * 0.5, ey, 0.9, ry - 0.5, "e");
      c.line(ex - 4, ey - ry - 1, ex + 4, ey - ry - (p.eye === "focus" ? 0 : 1), "k");
    }
  }
  // nostrils
  c.set(hx0 - 2, hy0 + 3, "k");
  c.set(hx0 + 2, hy0 + 3, "k");

  // mouth and fangs
  const my = hy0 + 6;
  if (p.mouth === 0) {
    c.line(hx0 - 7, my, hx0 + 7, my, "k");
  } else {
    c.rect(hx0 - 7, my, 14, 2 + p.mouth * 2, "k");
    c.rect(hx0 - 5, my + 1, 2, 3, "w");
    c.rect(hx0 + 3, my + 1, 2, 3, "w");
  }
  // forked tongue
  if (p.tongue) {
    const ty = my + (p.mouth ? 3 : 1);
    c.line(hx0, ty, hx0, ty + 4 + p.tongue, "t");
    c.line(hx0, ty + 4 + p.tongue, hx0 - 3, ty + 7 + p.tongue, "t");
    c.line(hx0, ty + 4 + p.tongue, hx0 + 3, ty + 7 + p.tongue, "t");
  }

  // four floating "space" blocks orbiting the hood: four spaces = one indent level
  if (p.blocks >= 0 && p.eye !== "dead") {
    for (let k = 0; k < 4; k++) {
      const bx = 14 + k * 5;
      const by = 18 - ((k + p.blocks) % 2) * 3 + (p.flash ? ((k * 3) % 4) : 0);
      c.rect(bx, by, 4, 4, "y");
      c.rect(bx + 1, by + 1, 2, 2, "o");
    }
  }

  // attack: a glowing ">>>" prompt bolt in front of the head
  if (p.bolt) {
    const bx = hx0 - 18 - p.bolt * 2;
    const by = hy0 + 2;
    c.disc(bx, by, p.bolt + 3, p.bolt + 2, "g");
    for (let k = 0; k < 3; k++) {
      const ox = bx - 3 + k * 3;
      c.line(ox, by - 3, ox + 2, by, "k");
      c.line(ox + 2, by, ox, by + 3, "k");
    }
  }

  c.outline("k", "i", SKIP);
  return c.rows();
}

const P = (o) => ({ ...base, ...o });
const anims = {
  idle: [P({ sway: 0 }), P({ sway: 1, dy: -1, blocks: 1, tongue: 1 }), P({ sway: 2, dy: -2, blocks: 0 }), P({ sway: 1, dy: -1, blocks: 1, eye: "blink" })].map(draw),
  attack: [
    P({ dy: 2, sway: 0, squash: 2, eye: "focus", mouth: 1 }),
    P({ lunge: 0.6, eye: "focus", mouth: 2, tongue: 1, bolt: 2 }),
    P({ lunge: 1, eye: "focus", mouth: 2, tongue: 2, bolt: 4, flash: 1 }),
    P({ lunge: 0.5, eye: "focus", mouth: 1, bolt: 3 }),
    P({}),
  ].map(draw),
  hurt: [P({ dx: 3, dy: 1, eye: "hurt", mouth: 2, flash: 1 }), P({ dx: -2, eye: "hurt", mouth: 2 }), P({ dx: 1, dy: 2, eye: "hurt", mouth: 1 })].map(draw),
  faint: [P({ dy: 3, squash: 2, eye: "hurt", mouth: 2 }), P({ dy: 8, squash: 4, eye: "dead", mouth: 2 }), P({ dy: 14, squash: 6, eye: "dead", mouth: 1 }), P({ dy: 18, squash: 8, eye: "dead", blocks: -1 })].map(draw),
};

writeFileSync(
  "game/sprites/creatures/warden-indent.ts",
  toModule({
    id: "warden-indent",
    name: "WARDEN INDENT",
    doc: "Warden Indent, the Python Port guardian. Front view, 96×96. A hooded serpent on three coils, each indented one step further than the last; four floating blocks are Python's four-space indent.",
    exportName: "WARDEN_INDENT",
    w: W,
    h: H,
    palette,
    fps: { idle: 4, attack: 7, hurt: 8, faint: 4 },
    anims,
    generator: "scripts/art/warden-indent.mjs",
  }),
);
console.log("wrote warden-indent");
