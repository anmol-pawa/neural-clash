// Generates game/sprites/creatures/scanwarden.ts (96x96 guardian, Conv Caverns).
// Scanwarden: a crystal-cave golem whose chest is a 5x5 grid of cells. A 3x3 window (the kernel)
// slides across the grid, and the cell under its centre lights magenta (the output). Same weights,
// every position: the warden never changes the window, only where it looks. Original design.
import { writeFileSync } from "node:fs";
import { Canvas, toModule } from "./raster.mjs";

const W = 96, H = 96;
const pal = {
  k: "#10131f", i: "#1c2236",
  a: "#2f3550", b: "#4a5275", c: "#6f7aa3", d: "#a4aed0", // cave-rock ramp
  m: "#0f4b52", n: "#1f8f95", o: "#4fd4cf", p: "#bdfff6", // teal crystal ramp
  v: "#4b2f96", u: "#8a63e8", // violet crystal
  g: "#ff4fb0", y: "#ffe27a", x: "#ff4f6d", e: "#0a0d16", w: "#ffffff",
};
const ROCK = ["a", "b", "c", "d"], TEAL = ["m", "n", "o", "p"];
const base = { dy: 0, eye: "open", win: [1, 1], flash: 0, sink: 0, shake: 0, beam: 0, armUp: 0, cracked: 0 };

function draw(p) {
  const c = new Canvas(W, H), cx = 48;
  const by = p.dy + p.sink;
  c.ellipse(cx, 91, 38, 4, ["i", "a", "b", "b"], { part: c.nextPart() });
  // legs
  for (const sg of [-1, 1]) c.ellipse(cx + sg * 15, 80 + by * 0.4, 10, 11, ROCK);
  // torso slab
  c.ellipse(cx, 56 + by, 31, 28, ROCK);
  // crystal shoulder spikes
  for (const sg of [-1, 1]) {
    c.ellipse(cx + sg * 27, 30 + by + p.armUp * -1, 5, 11, ["v", "v", "u", "u"], { angle: sg * 0.5 });
    c.ellipse(cx + sg * 35, 38 + by, 4, 8, ["v", "v", "u", "u"], { angle: sg * 0.9 });
  }
  // arms: heavy rock fists
  for (const sg of [-1, 1]) {
    const ay = 62 + by - p.armUp * (sg === 1 ? 1 : 0.4);
    c.ellipse(cx + sg * 38, ay, 7, 15, ROCK, { angle: sg * 0.08 });
    c.ellipse(cx + sg * 39, ay + 15, 8, 7, ROCK);
    c.rect(cx + sg * 39 - 2, ay + 13, 4, 1, "k", -1);
  }
  // chest panel: a 5x5 grid of cells, 6px each
  const gx = cx - 15, gy = 42 + by;
  c.rect(gx - 2, gy - 2, 34, 34, "k", -1);
  for (let r = 0; r < 5; r++) for (let q = 0; q < 5; q++) {
    const inWin = Math.abs(q - p.win[0]) <= 1 && Math.abs(r - p.win[1]) <= 1;
    const centre = q === p.win[0] && r === p.win[1];
    const col = p.eye === "dead" ? "a" : centre ? "g" : inWin ? "o" : ((q + r) % 2 ? "m" : "n");
    c.rect(gx + q * 6 + 1, gy + r * 6 + 1, 5, 5, col, -1);
    if (inWin && p.eye !== "dead") c.rect(gx + q * 6 + 1, gy + r * 6 + 1, 5, 1, centre ? "w" : "p", -1);
  }
  // window frame (the kernel outline)
  if (p.eye !== "dead") {
    const wx = gx + (p.win[0] - 1) * 6, wy = gy + (p.win[1] - 1) * 6;
    c.rect(wx, wy, 19, 1, "y", -1); c.rect(wx, wy + 18, 19, 1, "y", -1);
    c.rect(wx, wy, 1, 19, "y", -1); c.rect(wx + 18, wy, 1, 19, "y", -1);
  }
  // beam from the centre cell: the activation it just computed
  if (p.beam) {
    const bx = gx + p.win[0] * 6 + 3, bY = gy + p.win[1] * 6 + 3;
    for (let k = 0; k < p.beam; k++) c.rect(bx - 1 + k * 0, bY - 8 - k * 7, 3, 4, k % 2 ? "g" : "w", -1);
  }
  // head: faceted crystal with one wide eye
  const hy = 22 + by;
  c.ellipse(cx, hy, 15, 14, ["a", "n", "o", "p"]);
  c.ellipse(cx - 7, hy - 9, 3, 7, ["n", "o", "p", "p"], { angle: -0.35 });
  c.ellipse(cx + 8, hy - 9, 3, 6, ["n", "o", "p", "p"], { angle: 0.4 });
  c.rect(cx - 10, hy - 3, 20, 8, "e", -1);
  if (p.eye === "dead") {
    c.line(cx - 7, hy - 2, cx - 2, hy + 3, "x", -1); c.line(cx - 7, hy + 3, cx - 2, hy - 2, "x", -1);
    c.line(cx + 2, hy - 2, cx + 7, hy + 3, "x", -1); c.line(cx + 2, hy + 3, cx + 7, hy - 2, "x", -1);
  } else if (p.eye === "blink") {
    c.rect(cx - 8, hy + 1, 16, 1, "o", -1);
  } else {
    const col = p.eye === "hurt" ? "x" : "y";
    // pupil tracks the window position
    const px = cx - 4 + (p.win[0] - 2) * 2;
    c.rect(cx - 8, hy - 2, 16, 6, "p", -1);
    c.rect(px, hy - 1, 6, 4, col, -1);
    c.rect(px + 2, hy, 2, 2, "e", -1);
  }
  // cracks when hurt
  if (p.cracked) for (const [x0, y0, x1, y1] of [[cx - 20, 50 + by, cx - 12, 62 + by], [cx + 18, 70 + by, cx + 25, 82 + by]]) c.line(x0, y0, x1, y1, "k", -1);
  if (p.flash) for (const [ox, oy] of [[-24, 8], [22, 14], [0, -4]]) c.set(cx + ox, 22 + oy + by, "w", -1);
  c.outline("k", "i", new Set(["w", "e", "y", "x", "g"]));
  return c.rows();
}
const P = (o) => ({ ...base, ...o });
const anims = {
  idle: [P({ win: [1, 1] }), P({ win: [2, 1], dy: -1 }), P({ win: [3, 2], dy: -2, eye: "blink" }), P({ win: [2, 3], dy: -1 })].map(draw),
  attack: [P({ win: [1, 1], dy: 2, armUp: 0 }), P({ win: [1, 2], armUp: 6 }), P({ win: [2, 2], armUp: 10, flash: 1, beam: 1 }), P({ win: [3, 2], armUp: 10, flash: 1, beam: 2 }), P({ win: [3, 3], armUp: 6, beam: 3 }), P({})].map(draw),
  hurt: [P({ eye: "hurt", flash: 1, shake: 2, cracked: 1 }), P({ eye: "hurt", dy: 1, win: [3, 3], cracked: 1 }), P({ eye: "hurt", dy: 2, win: [3, 3], cracked: 1 })].map(draw),
  faint: [P({ eye: "hurt", dy: 2, cracked: 1 }), P({ eye: "dead", sink: 6, cracked: 1 }), P({ eye: "dead", sink: 13, cracked: 1 }), P({ eye: "dead", sink: 19, cracked: 1 })].map(draw),
};

writeFileSync("game/sprites/creatures/scanwarden.ts", toModule({
  id: "scanwarden", name: "SCANWARDEN", exportName: "SCANWARDEN", w: W, h: H, palette: pal,
  doc: "Scanwarden, the Conv Caverns guardian. Front view, 96×96. A crystal-cave golem with a 5×5 grid of cells on its chest; a 3×3 window slides across it and the cell under the window's centre lights magenta. It reads as a convolution kernel: one set of weights, applied at every position.",
  fps: { idle: 4, attack: 8, hurt: 8, faint: 4 }, anims, generator: "scripts/art/caverns-guardian.mjs",
}));
