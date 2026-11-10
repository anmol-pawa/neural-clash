// Generates game/sprites/creatures/warden-split.ts
// Warden Split, the Classic Grove guardian: an ancient oak golem built as a decision tree.
// The trunk is the root node (a glowing "x < t?" rune), two boughs fork into child-node
// fists, and the canopy is studded with class-coloured data points (cyan / magenta) that
// the tree has partitioned. Attack: it slams a dashed decision boundary through the arena.
// Original design, 96x96.
import { writeFileSync } from "node:fs";
import { Canvas, toModule } from "./raster.mjs";

const W = 96, H = 96;
const palette = {
  k: "#1a1208", i: "#2e2010",
  a: "#4a3018", b: "#7a5230", c: "#a8743f", d: "#d9a566", // bark ramp
  f: "#1f5a2e", g: "#2f8a3c", h: "#58b84a", j: "#a6e36a", // foliage ramp
  t: "#27d6c4", m: "#ff5fc8", z: "#ffffff", y: "#ffe27a", // data classes, rune glow
  e: "#10140a", w: "#ffffff", x: "#ff4f6d", n: "#9af7ff",
};
const BARK = ["a", "b", "c", "d"];
const LEAF = ["f", "g", "h", "j"];
const SKIP = new Set(["t", "m", "z", "y", "n"]);
const base = { dy: 0, squash: 0, eye: "open", sway: 0, rune: 0, slam: 0, flash: 0, leaves: 0, wilt: 0, split: 0 };

// fixed data-point scatter on the canopy; each point has a class
const POINTS = [[-24, -2, "t"], [-14, -10, "m"], [-4, -14, "t"], [8, -12, "m"], [20, -6, "t"], [26, 2, "m"], [-18, 6, "m"], [-6, 0, "t"], [12, 2, "t"], [2, 6, "m"], [-28, 8, "t"], [24, 10, "m"]];

function node(c, cx, cy, r, lit) {
  const part = c.nextPart();
  c.disc(cx, cy, r, r, "k", part);
  c.disc(cx, cy, r - 1.5, r - 1.5, lit ? "y" : "d", part);
  c.disc(cx - 1, cy - 1, r - 4, r - 4, lit ? "z" : "c", part);
}
function draw(p) {
  const c = new Canvas(W, H);
  const dy = p.dy, sq = p.squash, cx = 47;
  const ground = 88;

  // roots: gnarled feet splaying over the ground
  for (const [ox, rx] of [[-22, 14], [0, 10], [22, 14]]) c.ellipse(cx + ox, ground - 3 + dy * 0.3, rx, 4, BARK);
  for (const sg of [-1, 1]) { c.line(cx + sg * 10, ground - 6, cx + sg * 30, ground - 1, "b"); c.line(cx + sg * 10, ground - 5, cx + sg * 30, ground, "a"); }

  // trunk: tapered column, light from the left, bark grooves
  const top = 38 + dy + sq, bot = ground - 4 + dy * 0.3;
  const trunk = c.nextPart();
  for (let y = top; y <= bot; y++) {
    const t = (y - top) / (bot - top);
    const half = Math.round(11 + 7 * t * t);
    for (let x = -half; x <= half; x++) {
      const u = x / half;
      let lvl = 1;
      if (u < -0.5) lvl = 2; else if (u > 0.55) lvl = 0; else if (u < -0.1) lvl = 2;
      if ((x + y * 0.3 | 0) % 7 === 0 && lvl > 0) lvl--; // bark grooves
      c.set(cx + x, y, BARK[lvl], trunk);
    }
  }

  // forked boughs: root splits into left and right child boughs with node fists
  const lean = p.sway, slam = p.slam;
  const hand = [[cx - 33 - lean, 58 + dy + slam * 6], [cx + 33 + lean, 58 + dy + slam * 6]];
  for (const [hx, hy] of hand) {
    const sg = hx < cx ? -1 : 1;
    c.line(cx + sg * 8, top + 14, (cx + hx) / 2, top + 16, "c", -1);
    for (let k = -2; k <= 2; k++) c.line(cx + sg * 8, top + 14 + k, hx, hy + k, k < 0 ? "c" : k === 0 ? "b" : "a", -1);
  }
  const lit = p.rune;
  node(c, hand[0][0], hand[0][1], 8, lit === 1 || lit === 3);
  node(c, hand[1][0], hand[1][1], 8, lit === 2 || lit === 3);

  // canopy: clustered shaded foliage blobs
  const crown = c.nextPart();
  const blobs = [[-22, 24, 15, 11], [22, 24, 15, 11], [0, 16, 22, 14], [-10, 28, 14, 9], [11, 28, 14, 9]];
  for (const [ox, oy, rx, ry] of blobs) c.ellipse(cx + ox + p.sway * 0.5, oy + dy + sq * 0.5, rx, ry, LEAF, { part: crown });
  // data points scattered in the canopy: class-coloured pairs of pixels
  for (const [ox, oy, col] of POINTS) {
    const px = cx + ox + p.sway * 0.5, py = 24 + oy + dy + sq * 0.5;
    c.rect(px, py, 2, 2, col, -1);
  }
  // the learned boundary: a dashed white split line through the canopy
  const sx = cx + (p.split ? p.split * 10 - 10 : 0);
  for (let y = 8 + dy; y < 40 + dy; y += 3) c.rect(sx, y, 1, 2, "z", -1);

  // face on the trunk
  const hy = top + 6;
  if (p.eye === "dead") {
    for (const sg of [-1, 1]) { c.line(cx + sg * 6 - 2, hy, cx + sg * 6 + 2, hy + 4, "x"); c.line(cx + sg * 6 - 2, hy + 4, cx + sg * 6 + 2, hy, "x"); }
  } else if (p.eye === "blink") {
    c.rect(cx - 9, hy + 2, 6, 1, "k"); c.rect(cx + 4, hy + 2, 6, 1, "k");
  } else {
    const col = p.eye === "hurt" ? "x" : "n";
    c.rect(cx - 10, hy - 1, 7, 5, "e"); c.rect(cx + 4, hy - 1, 7, 5, "e");
    c.rect(cx - 8, hy, 3, 3, col); c.rect(cx + 6, hy, 3, 3, col);
    c.set(cx - 8, hy, "w"); c.set(cx + 6, hy, "w");
  }
  c.rect(cx - 12, hy - 4, 8, 1, "i", -1); c.rect(cx + 5, hy - 4, 8, 1, "i", -1);
  c.rect(cx - 4, hy + 9, 9, 1, "k", -1);

  // root rune on the chest: a node with two branches (x < t ?)
  const ry = hy + 20;
  const rc = lit ? "y" : "d";
  c.disc(cx, ry, 3, 3, rc, -1);
  c.line(cx, ry + 3, cx - 6, ry + 9, rc, -1); c.line(cx, ry + 3, cx + 6, ry + 9, rc, -1);
  c.disc(cx - 6, ry + 10, 2, 2, "t", -1); c.disc(cx + 6, ry + 10, 2, 2, "m", -1);

  // attack: dashed boundary slams across the ground, shock dust
  if (p.slam) {
    for (let x = 6; x < 90; x += 5) c.rect(x, 84 + dy, 3, 2, p.slam % 2 ? "z" : "n", -1);
    for (const sg of [-1, 1]) for (let k = 0; k < p.slam; k++) c.rect(cx + sg * (36 + k * 5), 80 - k * 3, 2, 2, "y", -1);
  }
  if (p.flash) for (const [ox, oy] of [[-18, 10], [20, 12], [0, 4]]) c.set(cx + ox, 28 + oy, "w", -1);
  // faint: leaves drifting down as the tree wilts
  if (p.leaves) for (const [x, y] of [[14, 40], [78, 36], [26, 56], [68, 52], [40, 66]]) c.rect(x, y + p.leaves * 6, 3, 2, "h");

  c.outline("k", "i", SKIP);
  return c.rows();
}

const P = (o) => ({ ...base, ...o });
const anims = {
  idle: [P({}), P({ dy: -1, sway: 1, rune: 1 }), P({ dy: -2, sway: 2, rune: 3, split: 1 }), P({ dy: -1, sway: 1, rune: 2, eye: "blink", split: 2 })].map(draw),
  attack: [
    P({ squash: 3, dy: 2, sway: -2, rune: 3 }),
    P({ slam: 1, rune: 3, split: 1 }),
    P({ slam: 2, rune: 3, split: 2, flash: 1 }),
    P({ slam: 3, rune: 3, split: 2, flash: 1 }),
    P({ sway: 1 }),
  ].map(draw),
  hurt: [P({ dy: 1, eye: "hurt", flash: 1, sway: -2 }), P({ eye: "hurt", sway: 2 }), P({ dy: 2, eye: "hurt", sway: -1 })].map(draw),
  faint: [P({ dy: 3, squash: 4, eye: "hurt", leaves: 1 }), P({ dy: 8, squash: 10, eye: "dead", leaves: 2 }), P({ dy: 12, squash: 16, eye: "dead", leaves: 3 }), P({ dy: 14, squash: 20, eye: "dead", leaves: 4 })].map(draw),
};

writeFileSync("game/sprites/creatures/warden-split.ts", toModule({
  id: "warden-split", name: "WARDEN SPLIT", exportName: "WARDEN_SPLIT", w: W, h: H, palette,
  doc: "Warden Split, the Classic Grove guardian. Front view, 96×96. An ancient oak golem built as a decision tree: a glowing root-node rune on the trunk, two boughs forking into child-node fists, and a canopy of class-coloured data points cut by a dashed split line.",
  fps: { idle: 4, attack: 7, hurt: 8, faint: 4 }, anims, generator: "scripts/art/warden-split.mjs",
}));
console.log("wrote warden-split");
