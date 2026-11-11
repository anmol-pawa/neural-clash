// Generates game/sprites/creatures/dimwarden.ts (96x96 guardian, Neuron Nest).
// Dimwarden: a totem of four stacked layer-slabs. The bottom (output) slab glows bright; each slab
// above it is dimmer and smaller, the top head is nearly dead (gradient vanishing on the way back),
// with a flat-lined ReLU hinge carved in its chest. Original design.
import { writeFileSync } from "node:fs";
import { Canvas, toModule } from "./raster.mjs";

const W = 96, H = 96;
const pal = {
  k: "#0e1620", i: "#1b2a3a",
  a: "#2c3e4f", b: "#475f73", c: "#6f8aa0", d: "#a9c1d2", // slate ramp
  m: "#1d4a3a", n: "#2f8a5c", o: "#58d68a", p: "#c6ffdc", // live-signal green ramp
  y: "#ffe27a", x: "#ff4f6d", v: "#6a4fd8", e: "#0a0f16", w: "#ffffff",
};
const SLATE = ["a", "b", "c", "d"], LIVE = ["m", "n", "o", "p"];
const base = { dy: 0, eye: "open", pulse: -1, flash: 0, sink: 0, shake: 0, sag: 0 };

// slabs from top (head) to bottom: [cy, rx, ry, brightness 0..3]
const SLABS = [[22, 15, 12, 0], [41, 19, 9, 1], [58, 23, 9, 2], [76, 28, 10, 3]];

function draw(p) {
  const c = new Canvas(W, H), cx = 48;
  c.ellipse(cx, 90, 38, 4, ["i", "a", "b", "b"], { part: c.nextPart() });
  // gradient wires dropping from the base up the back, fading with height
  SLABS.forEach(([cy, rx, ry, br], i) => {
    const y = cy + p.dy * (i === 0 ? 1 : 0.6) + Math.round(p.sag * (3 - i) * 0.5) + (i === 0 ? p.sink : p.sink * 0.8);
    const x = cx + (p.shake ? ((i % 2) ? p.shake : -p.shake) : 0);
    c.ellipse(x, y, rx, ry, SLATE);
    // seam glow: bright near the output, dead near the head
    const lit = p.pulse >= 0 ? (p.pulse === 3 - i ? 3 : br) : br;
    const ch = lit >= 3 ? "p" : lit === 2 ? "o" : lit === 1 ? "n" : "m";
    c.rect(x - rx + 4, y + ry - 3, rx * 2 - 8, 2, p.eye === "dead" ? "a" : ch, -1);
    // core window: a little unit whose glow shrinks with height
    const cr = 1 + br;
    c.disc(x, y, cr + 1, cr + 1, "k", -1);
    c.disc(x, y, cr, cr, p.eye === "dead" ? "a" : (lit >= 2 ? "p" : lit === 1 ? "o" : "n"), -1);
    // rivets
    for (const sg of [-1, 1]) c.set(x + sg * (rx - 4), y - 1, "k", -1);
  });
  // arms: two slab-fists, the lower pair brighter
  const aDy = p.dy + p.sink * 0.8;
  for (const sg of [-1, 1]) {
    const ax = cx + sg * (32 + (p.pulse >= 2 ? 3 : 0)), ay = 62 + aDy;
    c.ellipse(ax, ay, 5, 9, SLATE);
    c.rect(ax - 2, ay + 5, 4, 2, p.pulse >= 1 ? "o" : "n", -1);
  }
  // face on the head: two sleepy slits, a flat line mouth (zero activation)
  const hy = 22 + p.dy + p.sink;
  if (p.eye === "dead") {
    for (const sg of [-1, 1]) { c.line(cx + sg * 6 - 2, hy - 3, cx + sg * 6 + 2, hy + 1, "x", -1); c.line(cx + sg * 6 - 2, hy + 1, cx + sg * 6 + 2, hy - 3, "x", -1); }
  } else if (p.eye === "blink") {
    c.rect(cx - 9, hy - 1, 6, 1, "d", -1); c.rect(cx + 4, hy - 1, 6, 1, "d", -1);
  } else {
    const col = p.eye === "hurt" ? "x" : "y";
    for (const sg of [-1, 1]) { c.rect(cx + sg * 6 - 3, hy - 3, 6, 4, "e", -1); c.rect(cx + sg * 6 - 1, hy - 2, 2, 2, col, -1); }
  }
  c.rect(cx - 5, hy + 5, 11, 1, "e", -1); // the flat line: ReLU(x<0) = 0
  // a ReLU hinge carved on the chest slab: flat then rising
  const hx = cx - 9, hyy = 41 + p.dy * 0.6 + p.sink * 0.8;
  c.line(hx, hyy + 2, hx + 8, hyy + 2, "k", -1);
  c.line(hx + 8, hyy + 2, hx + 18, hyy - 4, "k", -1);
  // crown antenna: a lone dim spark that barely reaches the top
  c.rect(cx - 1, 6 + p.dy + p.sink, 2, 5, "c", -1);
  c.set(cx, 5 + p.dy + p.sink, p.eye === "dead" ? "a" : "n", -1);
  // returning-gradient pulse: sparks climbing the right side and fading
  if (p.pulse >= 0) for (let k = 0; k <= p.pulse + 1 && k < 4; k++) {
    const sy = 80 - k * 17, sx = cx + 31 - k * 2;
    c.rect(sx, sy, 3, 3, k === 0 ? "p" : k === 1 ? "o" : k === 2 ? "n" : "m", -1);
  }
  if (p.flash) for (const [ox, oy] of [[-22, 10], [20, 14], [0, 2]]) c.set(cx + ox, 22 + oy, "w", -1);
  c.outline("k", "i", new Set(["w", "e", "y", "x", "p"]));
  return c.rows();
}
const P = (o) => ({ ...base, ...o });
const anims = {
  idle: [P({}), P({ dy: -1 }), P({ dy: -2, eye: "blink" }), P({ dy: -1 })].map(draw),
  attack: [P({ dy: 2 }), P({ pulse: 0 }), P({ pulse: 1, flash: 1 }), P({ pulse: 2, flash: 1 }), P({ pulse: 3 }), P({})].map(draw),
  hurt: [P({ eye: "hurt", flash: 1, shake: 2 }), P({ eye: "hurt", shake: -2, dy: 1 }), P({ eye: "hurt", dy: 2 })].map(draw),
  faint: [P({ eye: "hurt", dy: 2, sag: 1, sink: 2 }), P({ eye: "dead", sag: 2, sink: 8 }), P({ eye: "dead", sag: 3, sink: 15 }), P({ eye: "dead", sag: 4, sink: 20 })].map(draw),
};

writeFileSync("game/sprites/creatures/dimwarden.ts", toModule({
  id: "dimwarden", name: "DIMWARDEN", exportName: "DIMWARDEN", w: W, h: H, palette: pal,
  doc: "Dimwarden, the Neuron Nest guardian. Front view, 96×96. A totem of four layer-slabs: the output slab glows bright and each slab above it is dimmer, the head nearly dead, with a flat-lined ReLU hinge carved in its chest. It reads as a vanishing gradient and dead units.",
  fps: { idle: 4, attack: 8, hurt: 8, faint: 4 }, anims, generator: "scripts/art/nest-guardian.mjs",
}));
