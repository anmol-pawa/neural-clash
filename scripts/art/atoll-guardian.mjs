// Generates game/sprites/creatures/heedray.ts (96x96 guardian, Attention Atoll).
// Heedray: a manta ray hovering over a row of pearls. One big "query" eye on its brow sends beams to the
// pearls (the keys); beam thickness is the attention weight, so it reads as a softmax row that sharpens
// and slides from pearl to pearl over the frames. Original design.
import { writeFileSync } from "node:fs";
import { Canvas, toModule } from "./raster.mjs";

const W = 96, H = 96;
const pal = {
  k: "#0c1a2a", i: "#16304a",
  a: "#1b4e7a", b: "#2f7fb0", c: "#5fb8d8", d: "#b6ecf2", // ray body ramp
  f: "#6a3a1e", g: "#a8693a", h: "#e0b074", // sand / coral rock ramp
  m: "#6a2a6a", n: "#b04aa8", o: "#e88ad8", p: "#fff0fa", // pearl ramp
  y: "#ffe27a", x: "#ff4f6d", e: "#0a0d16", w: "#ffffff",
};
const BODY = ["a", "b", "c", "d"], SAND = ["f", "g", "h", "h"], PEARL = ["m", "n", "o", "p"];
const base = { dy: 0, focus: 2, sharp: 1, eye: "open", flap: 0, flash: 0, sink: 0, lunge: 0 };
const PX = [14, 31, 48, 65, 82], PY = 80;

/** softmax of -(distance*s)^2 over the five pearls: the beam widths come from real softmax weights. */
function weights(focus, sharp) {
  const e = PX.map((_, j) => Math.exp(-sharp * (j - focus) ** 2));
  const z = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / z);
}

function draw(p) {
  const c = new Canvas(W, H), dy = p.dy + p.sink, cx = 48;
  // sand bar with pearls on it
  c.ellipse(cx, 90, 46, 5, SAND, { part: c.nextPart() });
  const w = weights(p.focus, p.sharp);
  const qx = cx, qy = 36 + dy; // the query eye
  // beams first (behind the pearls): one per pearl, thickness from its weight
  PX.forEach((px, j) => {
    const th = Math.max(0, Math.round(w[j] * 7));
    if (th === 0 || p.eye === "dead") return;
    const col = th >= 3 ? "y" : "h";
    for (let t = 0; t < 1; t += 1 / 60) {
      const x = qx + (px - qx) * t, y = qy + 8 + (PY - 4 - (qy + 8)) * t;
      c.rect(Math.round(x - th / 2), Math.round(y), th, 1, col, -1);
    }
  });
  PX.forEach((px, j) => {
    const r = 3 + Math.round(w[j] * 6);
    c.ellipse(px, PY + (j === p.focus ? -1 : 1), r, r, PEARL, { part: c.nextPart() });
    c.set(px - 1, PY - r + 1, "w", -1);
  });
  // ray body: wide diamond wings that flap, tail trailing behind
  const flap = p.flap;
  c.ellipse(cx - 24, 30 + dy - flap * 3, 22, 8, BODY, { angle: -0.35 + flap * 0.12, part: c.nextPart() });
  c.ellipse(cx + 24, 30 + dy - flap * 3, 22, 8, BODY, { angle: 0.35 - flap * 0.12, part: c.nextPart() });
  c.ellipse(cx, 34 + dy, 17, 13, BODY, { part: c.nextPart() });
  c.ellipse(cx, 46 + dy, 4, 8, BODY, { part: c.nextPart() }); // tail root
  c.rect(cx, 52 + dy, 1, 10, "b", -1);
  // belly speckles on the wings
  for (let k = 0; k < 5; k++) { c.set(cx - 38 + k * 4, 28 + dy - flap * 3 + (k % 2), "d", -1); c.set(cx + 38 - k * 4, 28 + dy - flap * 3 + (k % 2), "d", -1); }
  // the big query eye
  if (p.eye === "dead") {
    c.line(qx - 5, qy - 5, qx + 5, qy + 5, "x", -1); c.line(qx - 5, qy + 5, qx + 5, qy - 5, "x", -1);
  } else if (p.eye === "blink") {
    c.rect(qx - 8, qy, 16, 1, "y", -1);
  } else {
    const col = p.eye === "hurt" ? "x" : "y";
    c.disc(qx, qy, 9, 7, "e", -1);
    const lx = Math.round((p.focus - 2) * 1.2);
    c.disc(qx + lx, qy + 1, 5, 5, col, -1);
    c.set(qx + lx - 2, qy - 1, "w", -1); c.set(qx + lx - 1, qy - 2, "w", -1);
  }
  // two small side eyes so it reads as a creature
  for (const sg of [-1, 1]) if (p.eye !== "dead") c.disc(cx + sg * 13, 30 + dy, 2, 2, p.eye === "hurt" ? "x" : "e", -1);
  if (p.lunge) for (let k = 0; k < p.lunge * 3; k++) c.rect(cx + 18 + k * 5, 38 + dy + (k % 3) * 5, 3, 3, k % 2 ? "o" : "y", -1);
  if (p.flash) for (const [ox, oy] of [[-34, 22], [30, 18], [0, 12]]) c.set(cx + ox, oy + dy, "w", -1);
  c.outline("k", "i", new Set(["y", "w", "e", "x", "o", "p"]));
  return c.rows();
}
const P = (o) => ({ ...base, ...o });
const anims = {
  idle: [P({ focus: 2, sharp: 0.5 }), P({ focus: 1.4, sharp: 0.9, dy: -1, flap: 1 }), P({ focus: 1, sharp: 1.6, dy: -2, flap: 2 }), P({ focus: 1.6, sharp: 1, dy: -1, flap: 1, eye: "blink" })].map(draw),
  attack: [P({ dy: 2, focus: 2 }), P({ lunge: 1, focus: 3, sharp: 2, flap: -1 }), P({ lunge: 2, focus: 4, sharp: 3, flash: 1, flap: -2 }), P({ lunge: 3, focus: 4, sharp: 3, flash: 1 }), P({ focus: 3, sharp: 1 })].map(draw),
  hurt: [P({ dy: 1, eye: "hurt", flash: 1, sharp: 0.2 }), P({ eye: "hurt", focus: 0, sharp: 0.3, flap: -1 }), P({ dy: 2, eye: "hurt", sharp: 0.2 })].map(draw),
  faint: [P({ sink: 4, eye: "hurt", sharp: 0.2 }), P({ sink: 12, eye: "dead", sharp: 0.1, flap: -2 }), P({ sink: 24, eye: "dead", sharp: 0.1, flap: -3 }), P({ sink: 36, eye: "dead", sharp: 0.1, flap: -3 })].map(draw),
};

writeFileSync("game/sprites/creatures/heedray.ts", toModule({
  id: "heedray", name: "HEEDRAY", exportName: "HEEDRAY", w: W, h: H, palette: pal,
  doc: "Heedray, the Attention Atoll guardian. Front view, 96×96. A manta ray whose big query eye sends beams to five pearls; beam thickness is a softmax weight, so the beams sharpen and slide from pearl to pearl.",
  fps: { idle: 4, attack: 7, hurt: 8, faint: 4 }, anims, generator: "scripts/art/atoll-guardian.mjs",
}));
console.log("wrote heedray");
