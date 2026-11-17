// Generates game/sprites/creatures/loopwyrm.ts (96x96 guardian, Recurrent Rapids).
// Loopwyrm: a river serpent coiled into a ring so its tail feeds back into its head. A bright pulse
// (the hidden state) travels around the ring one segment-step per frame, and three orbs in the
// middle fade from old to new: h(t-2), h(t-1), h(t). Same body, same weights, every time step.
// Original design.
import { writeFileSync, mkdirSync } from "node:fs";
import { Canvas, toModule } from "./raster.mjs";

const W = 96, H = 96;
const pal = {
  k: "#0c1424", i: "#16233a",
  a: "#1d4b63", b: "#2a7a8c", c: "#47b3b0", d: "#9fe6d0", // river-teal scale ramp
  f: "#6b8a3a", h: "#a9c95a", // moss fins
  r: "#7a1f5c", s: "#d6358f", g: "#ff4fb0", q: "#ffd0ee", // state-pulse ramp
  y: "#ffe27a", x: "#ff4f6d", e: "#0a0d16", w: "#ffffff", l: "#cfeef0",
};
const SCALE = ["a", "b", "c", "d"], PULSE = ["r", "s", "g", "q"], MOSS = ["f", "f", "h", "h"];
const N = 16, CX = 48, CY = 50, R = 29;
const base = { dy: 0, eye: "open", pulse: 0, orbs: 1, lunge: 0, flash: 0, sink: 0, jaw: 0, broken: 0, cracked: 0 };

function seg(i) {
  // i = 0 (tail tip) .. N-1 (neck). The ring is open by one segment gap where tail meets head.
  const t = i / (N - 1);
  const ang = -Math.PI * 0.35 + t * Math.PI * 2 * 0.93;
  return { ang, x: CX + R * Math.cos(ang), y: CY + R * 0.88 * Math.sin(ang), r: 3.5 + t * 6 };
}

function draw(p) {
  const c = new Canvas(W, H);
  const by = p.dy + p.sink;
  c.ellipse(CX, 91, 36, 4, ["i", "a", "b", "b"], { part: c.nextPart() });
  // water ring shadow inside the loop
  c.ellipse(CX, CY + 2 + by, 17, 15, ["i", "i", "a", "a"], { part: c.nextPart() });
  // body: tail tip to neck so later segments overlap earlier ones
  for (let i = 0; i < N; i++) {
    const s = seg(i);
    const gone = p.broken && i > 4 && i < 11;
    const hot = !gone && ((i - p.pulse + N * 4) % N <= 1 || (p.pulse + N * 4 - i) % N === 0);
    const ramp = gone ? ["i", "i", "a", "a"] : hot ? PULSE : SCALE;
    const yOff = gone ? p.broken * 3 : 0;
    c.ellipse(s.x, s.y + by + yOff, s.r, s.r * 0.92, ramp, { angle: s.ang + Math.PI / 2 });
    // dorsal moss fin on the outer edge of each even segment
    if (i % 2 === 0 && i > 1 && !gone) {
      const ox = Math.cos(s.ang) * (s.r + 1.5), oy = Math.sin(s.ang) * (s.r + 1.5) * 0.9;
      c.ellipse(s.x + ox, s.y + oy + by, 2 + s.r * 0.18, 2.4, MOSS, { angle: s.ang });
    }
    // belly highlight scale
    if (!gone && i > 2 && !hot) c.set(s.x + Math.cos(s.ang + 2.4) * (s.r - 2), s.y + Math.sin(s.ang + 2.4) * (s.r - 2), "d", -1);
  }
  // the tail feeds into the head: a small pulse spark where they meet
  const tail = seg(0), neck = seg(N - 1);
  if (!p.broken && p.pulse % 2 === 0) c.rect(tail.x - 1, tail.y + by - 1, 3, 3, "q", -1);
  // head: wedge snout biting toward the tail tip
  const hx = neck.x + Math.cos(neck.ang + 1.5) * 4 + p.lunge, hy = neck.y + Math.sin(neck.ang + 1.5) * 4 + by;
  c.ellipse(hx, hy, 13, 10.5, ["a", "b", "c", "d"], { angle: neck.ang + 1.2 });
  c.ellipse(hx + Math.cos(neck.ang + 1.9) * 9, hy + Math.sin(neck.ang + 1.9) * 9 + p.jaw, 7, 4.6, ["a", "b", "c", "c"], { angle: neck.ang + 1.9 });
  // head crest fins
  c.ellipse(hx - 5, hy - 8, 2.5, 5, MOSS, { angle: -0.4 });
  c.ellipse(hx + 3, hy - 9, 2.2, 4.5, MOSS, { angle: 0.3 });
  // eye
  const ex = hx - 1, ey = hy - 2;
  if (p.eye === "dead") { c.line(ex - 2, ey - 2, ex + 2, ey + 2, "x", -1); c.line(ex - 2, ey + 2, ex + 2, ey - 2, "x", -1); }
  else if (p.eye === "blink") c.rect(ex - 2, ey + 1, 5, 1, "l", -1);
  else {
    c.rect(ex - 2, ey - 2, 5, 5, "l", -1);
    c.rect(ex - 1, ey - 1, 3, 3, p.eye === "hurt" ? "x" : "y", -1);
    c.set(ex, ey, "e", -1);
  }
  // mouth glow when lunging
  if (p.lunge) c.rect(hx + 4, hy + 6 + p.jaw, 4, 2, "g", -1);
  // state orbs in the middle: old -> new, brighter and bigger as they approach "now"
  if (p.eye !== "dead") {
    const ox = CX - 11, oy = CY + 3 + by;
    const specs = [[ox, oy + 5, 3.2, ["r", "r", "s", "s"]], [ox + 10, oy - 1, 4.2, ["r", "s", "g", "g"]], [ox + 21, oy - 6, 5.4, ["s", "g", "q", "w"]]];
    specs.slice(0, p.orbs + 2 > 3 ? 3 : p.orbs + 2).forEach(([x, y, r, ramp]) => c.ellipse(x, y, r, r, ramp));
    // arrows between orbs: the recurrence h(t-1) -> h(t)
    for (const [x, y] of [[ox + 5, oy + 2], [ox + 16, oy - 4]]) { c.rect(x, y, 3, 1, "l", -1); c.set(x + 3, y, "l", -1); c.set(x + 2, y - 1, "l", -1); c.set(x + 2, y + 1, "l", -1); }
  }
  if (p.cracked) for (const [x0, y0, x1, y1] of [[22, 40 + by, 26, 48 + by], [70, 62 + by, 75, 70 + by]]) c.line(x0, y0, x1, y1, "k", -1);
  if (p.flash) for (const [ox, oy] of [[-26, -16], [28, -10], [4, -30]]) c.set(CX + ox, CY + oy + by, "w", -1);
  c.outline("k", "i", new Set(["w", "e", "y", "x", "l", "q"]));
  return c.rows();
}
const P = (o) => ({ ...base, ...o });
const anims = {
  idle: [P({ pulse: 0, orbs: 1 }), P({ pulse: 4, dy: -1, orbs: 2 }), P({ pulse: 8, dy: -2, eye: "blink", orbs: 1 }), P({ pulse: 12, dy: -1, orbs: 2 })].map(draw),
  attack: [P({ pulse: 2, dy: 2, lunge: -3 }), P({ pulse: 6, lunge: -1, jaw: 1 }), P({ pulse: 10, lunge: 5, jaw: 3, flash: 1 }), P({ pulse: 12, lunge: 8, jaw: 3, flash: 1, orbs: 2 }), P({ pulse: 14, lunge: 4, jaw: 1 }), P({})].map(draw),
  hurt: [P({ eye: "hurt", flash: 1, cracked: 1, pulse: 3 }), P({ eye: "hurt", dy: 1, cracked: 1, pulse: 5, broken: 1 }), P({ eye: "hurt", dy: 2, cracked: 1, pulse: 7 })].map(draw),
  faint: [P({ eye: "hurt", dy: 2, cracked: 1, broken: 1 }), P({ eye: "dead", sink: 6, cracked: 1, broken: 2, orbs: 0 }), P({ eye: "dead", sink: 13, cracked: 1, broken: 3, orbs: 0 }), P({ eye: "dead", sink: 19, cracked: 1, broken: 3, orbs: 0 })].map(draw),
};

if (process.env.DUMP) { mkdirSync(process.env.DUMP, { recursive: true }); writeFileSync(`${process.env.DUMP}/loopwyrm.json`, JSON.stringify({ pal, anims })); }
else writeFileSync("game/sprites/creatures/loopwyrm.ts", toModule({
  id: "loopwyrm", name: "LOOPWYRM", exportName: "LOOPWYRM", w: W, h: H, palette: pal,
  doc: "Loopwyrm, the Recurrent Rapids guardian. Front view, 96×96. A river serpent coiled so its tail feeds its head; a bright pulse (the hidden state) travels the ring each frame, and three orbs in the middle grow from h(t-2) to h(t). It reads as a recurrent network: the same body reused at every time step, carrying state forward.",
  fps: { idle: 4, attack: 8, hurt: 8, faint: 4 }, anims, generator: "scripts/art/rapids-guardian.mjs",
}));
