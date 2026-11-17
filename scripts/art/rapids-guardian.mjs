// Generates game/sprites/creatures/loopwyrm.ts (96x96 guardian, Recurrent Rapids).
// Loopwyrm: a river serpent coiled into a ring of eight segments. One amber "state" orb is passed
// from segment to segment each beat (the hidden state h_t carried through time) and the tail feeds
// back into the head's mouth (the recurrence). Original design.
import { writeFileSync } from "node:fs";
import { Canvas, toModule } from "./raster.mjs";

const W = 96, H = 96;
const pal = {
  k: "#0e1722", i: "#16293a",
  a: "#1d4a63", b: "#2a7b8e", c: "#47b5b0", d: "#9be3d0", // river-scale ramp
  m: "#3b2a66", n: "#6a4fc0", o: "#9d86ee", // violet fins
  s: "#8a5a2a", t: "#c28a45", u: "#efc47a", // gold belly / state orb ramp
  g: "#ff9d2e", y: "#fff0a0", x: "#ff4f6d", e: "#0a0d16", w: "#ffffff", q: "#a8f0ff",
};
const SCALE = ["a", "b", "c", "d"], FIN = ["m", "m", "n", "o"], GOLD = ["s", "t", "u", "u"];
const base = { dy: 0, orb: 0, eye: "open", flash: 0, sink: 0, spin: 0, spray: 0, cracked: 0 };
const N = 8, R = 27, CX = 48, CY = 58;

function draw(p) {
  const c = new Canvas(W, H);
  const by = p.dy + p.sink;
  c.ellipse(CX, 91, 40, 4, ["i", "a", "b", "b"], { part: c.nextPart() });
  // water ripples around the base
  for (const [ox, w] of [[-34, 8], [27, 9], [-12, 6]]) c.rect(CX + ox, 87 + (p.spin % 2), w, 1, "q", -1);
  // fins on the ring, behind the body
  for (let k = 0; k < N; k++) {
    const a = ((k + 0.5) / N) * Math.PI * 2 - Math.PI / 2;
    c.ellipse(CX + Math.cos(a) * (R + 9), CY + by + Math.sin(a) * (R + 9) * 0.92, 3, 6, FIN, { angle: a + Math.PI / 2 });
  }
  // ring of segments: k=0 is the head side (top), the rest follow clockwise
  for (let k = N - 1; k >= 0; k--) {
    const a = (k / N) * Math.PI * 2 - Math.PI / 2;
    const x = CX + Math.cos(a) * R, y = CY + by + Math.sin(a) * R * 0.92;
    const size = 9 - (k > 4 ? (k - 4) * 0.8 : 0); // tail tapers
    c.ellipse(x, y, size, size - 1, SCALE, { angle: a + Math.PI / 2 });
    c.ellipse(x, y + 2, size - 4, size - 5, GOLD, { angle: a + Math.PI / 2 });
  }
  // inner core: the cell the state loops around
  c.ellipse(CX, CY + by, 13, 12, ["i", "a", "a", "b"]);
  c.rect(CX - 6, CY + by - 1, 12, 2, "e", -1);
  c.line(CX - 5, CY + by - 4, CX + 5, CY + by - 4, "c", -1);
  c.line(CX - 5, CY + by + 4, CX + 5, CY + by + 4, "c", -1);
  // the state orb on segment p.orb, with a short trail behind it
  if (p.eye !== "dead") for (let tr = 2; tr >= 0; tr--) {
    const k = (p.orb - tr + N) % N, a = (k / N) * Math.PI * 2 - Math.PI / 2;
    const x = Math.round(CX + Math.cos(a) * R), y = Math.round(CY + by + Math.sin(a) * R * 0.92);
    const r = tr === 0 ? 5 : tr === 1 ? 3 : 2;
    c.ellipse(x, y, r, r, tr === 0 ? ["t", "g", "y", "y"] : ["s", "t", "g", "g"], { part: -1 });
    if (tr === 0) c.set(x - 1, y - 1, "w", -1);
  }
  // head at the top: a long muzzle that the tail bites back into (the feedback loop)
  const hx = CX + 6, hy = CY + by - R * 0.92 - 4;
  c.ellipse(hx - 8, hy + 2, 8, 6, SCALE, { angle: -0.2 });
  c.ellipse(hx, hy - 2, 12, 10, SCALE);
  c.ellipse(hx - 14, hy + 3, 3, 5, FIN, { angle: -0.6 });
  c.ellipse(hx + 8, hy - 11, 3, 7, FIN, { angle: 0.5 });
  c.ellipse(hx - 1, hy - 12, 3, 6, FIN, { angle: -0.2 });
  // eye
  if (p.eye === "dead") {
    c.line(hx + 1, hy - 5, hx + 6, hy, "x", -1); c.line(hx + 1, hy, hx + 6, hy - 5, "x", -1);
  } else if (p.eye === "blink") {
    c.rect(hx + 1, hy - 2, 6, 1, "e", -1);
  } else {
    c.rect(hx + 1, hy - 5, 7, 6, "e", -1);
    c.rect(hx + 2, hy - 4, 5, 4, p.eye === "hurt" ? "x" : "y", -1);
    c.rect(hx + 4, hy - 3, 2, 2, "e", -1);
  }
  // mouth/tail feedback arrow: three pixels hopping along the muzzle
  if (p.eye !== "dead") for (let k = 0; k < 3; k++) c.set(hx - 12 + k * 2 + (p.spin % 2), hy + 6, k === 2 ? "y" : "g", -1);
  // spray: the water burst of the attack
  for (let k = 0; k < p.spray; k++) c.rect(CX - 30 + k * 11 + (k % 2) * 4, 24 + by - k * 3, 3, 5, k % 2 ? "q" : "w", -1);
  if (p.cracked) for (const [x0, y0, x1, y1] of [[CX - 30, CY + by - 4, CX - 24, CY + by + 6], [CX + 26, CY + by + 8, CX + 31, CY + by + 18]]) c.line(x0, y0, x1, y1, "k", -1);
  if (p.flash) for (const [ox, oy] of [[-26, -14], [28, -6], [0, 16]]) c.set(CX + ox, CY + oy + by, "w", -1);
  c.outline("k", "i", new Set(["w", "e", "y", "x", "g", "q"]));
  return c.rows();
}
const P = (o) => ({ ...base, ...o });
const anims = {
  idle: [P({ orb: 0, spin: 0 }), P({ orb: 1, dy: -1, spin: 1 }), P({ orb: 2, dy: -2, eye: "blink", spin: 2 }), P({ orb: 3, dy: -1, spin: 3 })].map(draw),
  attack: [P({ orb: 4, dy: 2 }), P({ orb: 5, dy: 1, spray: 1 }), P({ orb: 6, dy: -3, spray: 2, flash: 1 }), P({ orb: 7, dy: -4, spray: 3, flash: 1 }), P({ orb: 0, dy: -2, spray: 4 }), P({})].map(draw),
  hurt: [P({ eye: "hurt", flash: 1, cracked: 1, orb: 2 }), P({ eye: "hurt", dy: 1, cracked: 1, orb: 2 }), P({ eye: "hurt", dy: 2, cracked: 1, orb: 1 })].map(draw),
  faint: [P({ eye: "hurt", dy: 2, cracked: 1 }), P({ eye: "dead", sink: 6, cracked: 1 }), P({ eye: "dead", sink: 13, cracked: 1 }), P({ eye: "dead", sink: 19, cracked: 1 })].map(draw),
};

writeFileSync("game/sprites/creatures/loopwyrm.ts", toModule({
  id: "loopwyrm", name: "LOOPWYRM", exportName: "LOOPWYRM", w: W, h: H, palette: pal,
  doc: "Loopwyrm, the Recurrent Rapids guardian. Front view, 96×96. A river serpent coiled into a ring of eight segments with a glowing amber orb handed from segment to segment each beat, and a tail that feeds back into the head: a hidden state carried through time by recurrence.",
  fps: { idle: 4, attack: 8, hurt: 8, faint: 4 }, anims, generator: "scripts/art/rapids-guardian.mjs",
}));
