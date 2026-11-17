// Generates game/sprites/creatures/loopwyrm.ts (96x96 guardian, Recurrent Rapids).
// Loopwyrm: a river serpent coiled into a ring whose tail runs back into its own mouth: the hidden
// state fed back as the next input. Glowing memory beads sit along the coil; the ones far from the
// head are dim (what a plain RNN forgets over many steps). Original design.
import { writeFileSync } from "node:fs";
import { Canvas, toModule } from "./raster.mjs";

const W = 96, H = 96;
const pal = {
  k: "#0e1722", i: "#18283a",
  a: "#1d4f63", b: "#2c7b8a", c: "#4cb3b0", d: "#9be3d2", // river-teal scale ramp
  f: "#7a4a2a", g: "#b8793f", h: "#e6b66a", // belly / fin amber ramp
  m: "#3a2a7a", n: "#6b55d6", o: "#a995ff", p: "#e1d9ff", // memory-bead violet ramp
  y: "#ffe27a", x: "#ff4f6d", e: "#0a0d16", w: "#ffffff",
};
const SCALE = ["a", "b", "c", "d"], BEAD = ["m", "n", "o", "p"], FIN = ["f", "g", "h", "h"];
const base = { dy: 0, eye: "open", turn: 0, flash: 0, sink: 0, lunge: 0, pulse: 0, cracked: 0 };
const CX = 48, CY = 52, R = 28, N = 16;

function draw(p) {
  const c = new Canvas(W, H);
  const by = p.dy + p.sink;
  c.ellipse(CX, 91, 36, 4, ["i", "a", "b", "b"], { part: c.nextPart() });
  // coil: segments march around the ring; the tail (t=0) is thin, the neck (t=1) is thick
  const seg = [];
  for (let s = 0; s < N; s++) {
    const t = s / (N - 1);
    const ang = Math.PI * 0.88 + (s + p.turn) * ((Math.PI * 1.9) / (N - 1)) - Math.PI * 0.0;
    const x = CX + R * Math.cos(ang), y = CY + by + R * Math.sin(ang) * 0.95;
    seg.push({ x, y, t, r: 4 + t * 5 });
  }
  // draw tail-first so the neck overlaps; belly stripe then scale body
  for (const g of seg) {
    c.ellipse(g.x, g.y, g.r, g.r, SCALE);
    c.ellipse(g.x + 1, g.y + g.r * 0.35, g.r * 0.55, g.r * 0.4, FIN);
  }
  // memory beads: bright near the head, dim toward the tail (vanishing signal)
  for (let s = 3; s < N; s += 3) {
    const g = seg[s];
    const lvl = p.eye === "dead" ? 0 : Math.round(g.t * 3);
    const ramp = lvl === 0 ? ["i", "a", "m", "m"] : lvl === 1 ? ["a", "m", "n", "n"] : lvl === 2 ? ["m", "n", "o", "o"] : BEAD;
    c.ellipse(g.x, g.y - 1, 3, 3, ramp);
    if (p.pulse && lvl >= 2) c.set(g.x, g.y - 1, "w", -1);
  }
  // dorsal fin crest along the outer edge
  for (let s = 2; s < N; s += 2) {
    const g = seg[s];
    const ang = Math.atan2(g.y - (CY + by), g.x - CX);
    c.ellipse(g.x + Math.cos(ang) * (g.r + 2), g.y + Math.sin(ang) * (g.r + 2), 2, 4, FIN, { angle: ang + Math.PI / 2 });
  }
  // head: sits at the neck end, mouth open around the tail tip
  const hd = seg[N - 1];
  const hx = hd.x + p.lunge, hy = hd.y - 1;
  c.ellipse(hx - 3, hy - 2, 11, 9, SCALE, { angle: 0.5 });
  c.ellipse(hx - 2, hy + 4, 8, 4, FIN, { angle: 0.5 });
  c.ellipse(hx - 9, hy - 10, 3, 6, FIN, { angle: -0.4 });
  c.ellipse(hx + 1, hy - 11, 3, 5, FIN, { angle: 0.3 });
  // the tail tip enters the open mouth
  const tl = seg[0];
  c.ellipse(tl.x, tl.y, 3, 3, SCALE);
  c.rect(hx - 1, hy + 1, 5, 4, "e", -1);
  // eye
  const ex = hx - 6, ey = hy - 6;
  if (p.eye === "dead") {
    c.line(ex - 2, ey - 2, ex + 2, ey + 2, "x", -1); c.line(ex - 2, ey + 2, ex + 2, ey - 2, "x", -1);
  } else if (p.eye === "blink") {
    c.rect(ex - 3, ey, 7, 1, "d", -1);
  } else {
    const col = p.eye === "hurt" ? "x" : "y";
    c.rect(ex - 3, ey - 2, 7, 5, "p", -1);
    c.rect(ex - 1, ey - 1, 4, 4, col, -1);
    c.rect(ex, ey, 2, 2, "e", -1);
  }
  if (p.cracked) for (const [x0, y0, x1, y1] of [[CX - 26, CY + 8 + by, CX - 20, CY + 18 + by], [CX + 22, CY - 6 + by, CX + 28, CY + 4 + by]]) c.line(x0, y0, x1, y1, "k", -1);
  if (p.flash) for (const [ox, oy] of [[-8, -26], [10, -22], [22, 4]]) c.set(CX + ox, CY + oy + by, "w", -1);
  c.outline("k", "i", new Set(["w", "e", "y", "x"]));
  return c.rows();
}
const P = (o) => ({ ...base, ...o });
const anims = {
  idle: [P({ turn: 0 }), P({ turn: 0.35, dy: -1 }), P({ turn: 0.7, dy: -2, eye: "blink" }), P({ turn: 0.35, dy: -1 })].map(draw),
  attack: [P({ dy: 2, lunge: -3 }), P({ lunge: -5, turn: 0.4 }), P({ lunge: 5, flash: 1, pulse: 1 }), P({ lunge: 8, flash: 1, pulse: 1, turn: 0.4 }), P({ lunge: 3 }), P({})].map(draw),
  hurt: [P({ eye: "hurt", flash: 1, cracked: 1, lunge: -2 }), P({ eye: "hurt", dy: 1, cracked: 1, lunge: -3 }), P({ eye: "hurt", dy: 2, cracked: 1 })].map(draw),
  faint: [P({ eye: "hurt", dy: 2, cracked: 1 }), P({ eye: "dead", sink: 6, cracked: 1 }), P({ eye: "dead", sink: 13, cracked: 1 }), P({ eye: "dead", sink: 19, cracked: 1 })].map(draw),
};

writeFileSync("game/sprites/creatures/loopwyrm.ts", toModule({
  id: "loopwyrm", name: "LOOPWYRM", exportName: "LOOPWYRM", w: W, h: H, palette: pal,
  doc: "Loopwyrm, the Recurrent Rapids guardian. Front view, 96×96. A river serpent coiled into a ring whose tail runs back into its own mouth (the hidden state fed back as the next input). Violet memory beads glow near the head and dim toward the tail: what a plain RNN forgets over many steps.",
  fps: { idle: 4, attack: 8, hurt: 8, faint: 4 }, anims, generator: "scripts/art/rapids-guardian.mjs",
}));
