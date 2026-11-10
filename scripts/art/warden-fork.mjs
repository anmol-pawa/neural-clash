// Generates game/sprites/creatures/warden-fork.ts
// Warden Fork, the Classic Grove guardian: a living decision tree. Its head is the root
// node (a leaf canopy with a face), its two arms are branches ending in child nodes (a
// cyan YES fist and a magenta NO fist), and its legs are roots that fork. A split-rule
// glyph is carved into its chest. Original design, 96x96.
import { writeFileSync } from "node:fs";
import { Canvas, toModule } from "./raster.mjs";

const W = 96, H = 96;
const palette = {
  k: "#0e1a12", i: "#1d3a24",
  a: "#4a2f1e", b: "#6e4a2c", c: "#94693d", d: "#c08f58", // bark ramp
  f: "#1f5a2b", g: "#2f8a3c", h: "#58b84a", j: "#9be06a", // leaf ramp
  u: "#14677f", v: "#1fa3c4", y: "#5fdcef", z: "#c6faff", // YES node (cyan)
  l: "#8c2a6e", m: "#d94aa8", p: "#ff7fd0", q: "#ffd1ee", // NO node (magenta)
  e: "#0c0f26", w: "#ffffff", x: "#ff4f6d", S: "#e8ffb0",
};
const BARK = ["a", "b", "c", "d"], LEAF = ["f", "g", "h", "j"], YES = ["u", "v", "y", "z"], NO = ["l", "m", "p", "q"];
const SKIP = new Set(["S"]);
const base = { dy: 0, squash: 0, eye: "open", sway: 0, reach: 0, lean: 0, flash: 0, bolts: 0, fall: 0, glow: 0 };

function thick(c, x0, y0, x1, y1, ch, w, part) {
  for (let o = -Math.floor(w / 2); o <= Math.floor(w / 2); o++) c.line(x0 + o, y0, x1 + o, y1, ch, part);
}
function draw(p) {
  const c = new Canvas(W, H);
  const dy = p.dy, sq = p.squash, cx = 47 + p.lean;

  // mossy plinth
  c.ellipse(47, 88 + dy * 0.3, 35, 5, LEAF);
  c.ellipse(47, 86 + dy * 0.3, 30, 3, LEAF, { bias: 0.1 });

  // roots (legs) that fork from the torso
  const legTop = 66 + dy + sq, footY = 85 + dy * 0.3;
  const roots = c.nextPart();
  for (const sg of [-1, 1]) {
    thick(c, cx + sg * 6, legTop, cx + sg * 17, footY - 4, "b", 6, roots);
    thick(c, cx + sg * 17, footY - 4, cx + sg * 22, footY, "b", 5, roots);
    thick(c, cx + sg * 17, footY - 4, cx + sg * 12, footY, "b", 4, roots);
    c.rect(cx + sg * 17 - 1, legTop + 6, 2, footY - legTop - 10, "c", roots);
  }

  // torso (trunk) with a carved split-rule glyph
  const torsoY = 55 + dy + sq / 2;
  c.ellipse(cx, torsoY, 17, 16 - sq / 3, BARK);
  for (let k = 0; k < 4; k++) c.rect(cx - 12 + k * 7, torsoY - 12 + (k % 2) * 3, 1, 8, "a", -1); // bark grain
  // glyph: a Y fork, root node above, two children below
  const gy = torsoY - 3;
  c.rect(cx - 1, gy - 5, 3, 5, "z", -1);
  c.line(cx, gy, cx - 6, gy + 6, "y", -1); c.line(cx + 1, gy, cx + 7, gy + 6, "p", -1);
  c.rect(cx - 8, gy + 6, 3, 3, "y", -1); c.rect(cx + 6, gy + 6, 3, 3, "p", -1);

  // arms: branches reaching to the two child nodes
  const r = p.reach, s = p.sway;
  const lx = cx - 33 - r, ly = 48 + dy - s - r * 2;
  const rx = cx + 33 + r, ry = 48 + dy + s - r * 2;
  const arms = c.nextPart();
  thick(c, cx - 12, torsoY - 7, lx + 4, ly + 3, "b", 5, arms);
  thick(c, cx + 12, torsoY - 7, rx - 4, ry + 3, "b", 5, arms);
  c.line(cx - 12, torsoY - 9, lx + 4, ly + 1, "d", arms); c.line(cx + 12, torsoY - 9, rx - 4, ry + 1, "d", arms);
  // child-node fists
  c.ellipse(lx, ly, 9, 9, YES, { bias: p.glow * 0.15 });
  c.ellipse(rx, ry, 9, 9, NO, { bias: p.glow * 0.15 });
  c.rect(lx - 1, ly - 3, 3, 6, "w", -1); c.rect(lx - 3, ly - 1, 3, 2, "w", -1); // tick-like Y mark
  c.rect(rx - 3, ry - 3, 2, 6, "w", -1); c.rect(rx + 1, ry - 3, 2, 6, "w", -1); c.line(rx - 3, ry - 3, rx + 2, ry + 2, "w", -1); // N-ish mark

  // head: the root node, a leaf canopy
  const hy = 31 + dy + sq;
  for (const [ox, oy, rr] of [[-12, 4, 9], [12, 4, 9], [-6, -8, 9], [7, -8, 9]]) c.ellipse(cx + ox, hy + oy, rr, rr - 1, LEAF);
  const face = c.ellipse(cx, hy + 3, 14, 13, LEAF);
  // gold highlights on leaves
  for (const [ox, oy] of [[-14, -2], [10, -12], [-4, -14], [16, 2]]) c.rect(cx + ox, hy + oy, 2, 2, "j", -1);
  // face
  const ey = hy + 1;
  if (p.eye === "dead") {
    for (const sg of [-1, 1]) { c.line(cx + sg * 6 - 2, ey, cx + sg * 6 + 2, ey + 4, "x"); c.line(cx + sg * 6 - 2, ey + 4, cx + sg * 6 + 2, ey, "x"); }
  } else if (p.eye === "blink") {
    c.rect(cx - 9, ey + 2, 6, 1, "k"); c.rect(cx + 4, ey + 2, 6, 1, "k");
  } else {
    const col = p.eye === "hurt" ? "x" : "z";
    c.rect(cx - 10, ey - 1, 7, 5, "e"); c.rect(cx + 4, ey - 1, 7, 5, "e");
    c.rect(cx - 8, ey, 3, 3, col); c.rect(cx + 6, ey, 3, 3, col);
    c.set(cx - 8, ey, "w"); c.set(cx + 6, ey, "w");
  }
  c.rect(cx - 12, ey - 4, 8, 1, "i", -1); c.rect(cx + 5, ey - 4, 8, 1, "i", -1); // brows
  c.rect(cx - 3, ey + 8, 7, 1, "k", -1);
  if (p.glow) for (const [ox, oy] of [[-8, -14], [8, -14], [0, -17]]) c.set(cx + ox, hy + oy, "S", -1);

  // attack: leaf-shaped data points fly toward the viewer's side
  if (p.bolts) for (let k = 0; k < p.bolts; k++) {
    const bx = rx + 8 + k * 6, by = ry - 2 + (k % 2 ? 5 : -4) - k;
    if (bx < 92) { c.rect(bx, by, 3, 3, "S", -1); c.set(bx + 1, by + 1, k % 2 ? "p" : "y", -1); }
  }
  if (p.fall) for (const [x, y] of [[14, 24], [78, 20], [24, 44], [70, 40], [50, 12]]) c.rect(x, y + p.fall * 7, 3, 2, "h");
  if (p.flash) for (const [ox, oy] of [[-18, 6], [20, 8], [0, -6]]) c.set(cx + ox, hy + oy, "w", -1);

  c.outline("k", "i", SKIP);
  return c.rows();
}

const P = (o) => ({ ...base, ...o });
const anims = {
  idle: [P({}), P({ dy: -1, sway: 1 }), P({ dy: -2, sway: 2, glow: 1 }), P({ dy: -1, sway: 1, eye: "blink" })].map(draw),
  attack: [
    P({ squash: 3, dy: 2, sway: -2 }),
    P({ reach: 3, lean: -1, bolts: 1 }),
    P({ reach: 6, bolts: 2, flash: 1, glow: 1 }),
    P({ reach: 6, bolts: 3, flash: 1 }),
    P({ reach: 1 }),
  ].map(draw),
  hurt: [P({ dy: 1, eye: "hurt", flash: 1, fall: 1 }), P({ eye: "hurt", lean: 2, fall: 2 }), P({ dy: 2, eye: "hurt", lean: -1, fall: 3 })].map(draw),
  faint: [P({ dy: 3, squash: 4, eye: "hurt", fall: 1 }), P({ dy: 8, squash: 10, eye: "dead", fall: 2 }), P({ dy: 12, squash: 16, eye: "dead", fall: 3 }), P({ dy: 14, squash: 20, eye: "dead", fall: 4 })].map(draw),
};

writeFileSync("game/sprites/creatures/warden-fork.ts", toModule({
  id: "warden-fork", name: "WARDEN FORK", exportName: "WARDEN_FORK", w: W, h: H, palette,
  doc: "Warden Fork, the Classic Grove guardian. Front view, 96×96. A living decision tree: the head is the root node, the arms are branches ending in a cyan YES node and a magenta NO node, the legs are forking roots, and a split-rule glyph is carved into the trunk.",
  fps: { idle: 4, attack: 7, hurt: 8, faint: 4 }, anims, generator: "scripts/art/warden-fork.mjs",
}));
console.log("wrote warden-fork");
