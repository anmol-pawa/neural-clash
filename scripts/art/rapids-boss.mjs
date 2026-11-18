// Generates game/sprites/creatures/drift.ts (96x96 boss, Recurrent Rapids).
// Drift: a driftwood-raft spirit with a mast sail. The sail shows two bell curves: a faint dashed ghost where
// the training data sat, and a bright live curve that slides away over the frames (distribution drift).
// Original design.
import { writeFileSync } from "node:fs";
import { Canvas, toModule } from "./raster.mjs";

const W = 96, H = 96;
const pal = {
  k: "#0e1620", i: "#1b2a3a",
  a: "#4a2f1e", b: "#7a4f2e", c: "#a87440", d: "#d6a86a", // driftwood ramp
  q: "#a89c7c", r: "#cfc4a2", s: "#ece3c6", u: "#fffaf0", // sail ramp
  t: "#1f8f9a", n: "#8fe8f0", v: "#6a7fd6", m: "#ff5fc8", g: "#3ddc84", x: "#ff4f6d", y: "#ffe27a", e: "#0a1018", w: "#ffffff",
};
const WOOD = ["a", "b", "c", "d"], CLOTH = ["q", "r", "s", "u"];
const base = { dy: 0, slide: 0, eye: "open", look: 0, ripple: 0, lunge: 0, flash: 0, sink: 0, tilt: 0 };

function draw(p) {
  const c = new Canvas(W, H), cx = 46, dy = p.dy + p.sink;
  // water: layered ripples that travel with the drift
  c.ellipse(cx, 88 + p.sink * 0.3, 40, 5, ["i", "t", "t", "n"], { part: c.nextPart() });
  for (let k = 0; k < 4; k++) c.rect(((k * 23 + p.ripple * 7) % 80) + 6, 86 + (k % 2) * 3 + Math.round(p.sink * 0.3), 9, 1, "n", -1);
  // hull: a stack of logs lashed together, tilting as it slides
  for (let k = 0; k < 4; k++) {
    const y = 68 + k * 5 + dy + Math.round(p.tilt * (k - 1.5) * 0.4);
    c.ellipse(cx + (k % 2) * 2, y, 33 - k * 2, 5, WOOD);
    c.disc(cx - 31 + k * 2, y, 3, 3, "d", -1); c.disc(cx - 31 + k * 2, y, 1, 1, "a", -1); // log end rings
  }
  c.rect(cx - 30, 70 + dy, 60, 2, "k", -1); // lashing
  for (let k = -2; k <= 2; k++) c.rect(cx + k * 12 - 1, 66 + dy, 3, 18, "y", -1); // rope
  // mast
  c.rect(cx - 1, 6 + dy, 3, 62, "b", -1); c.rect(cx - 1, 6 + dy, 1, 62, "d", -1);
  // sail: the plot area
  const sx = cx + 2, sy = 12 + dy, sw = 40, sh = 42;
  c.rect(sx - 1, sy - 1, sw + 2, sh + 2, "k", -1);
  c.rect(sx, sy, sw, sh, "s", -1);
  c.rect(sx, sy, sw, 3, "u", -1); c.rect(sx, sy + sh - 3, sw, 3, "r", -1);
  c.line(sx + 3, sy + sh - 6, sx + sw - 3, sy + sh - 6, "q", -1); // x-axis
  const bell = (mu, h, col, dashed) => {
    for (let x = -17; x <= 17; x++) {
      const y = Math.round(h * Math.exp(-(x * x) / 62));
      if (dashed && (x & 2)) continue;
      const px = Math.round(sx + sw / 2 + x + mu), py = sy + sh - 7 - y;
      if (px > sx + 1 && px < sx + sw - 2) { c.set(px, py, col, -1); if (!dashed) c.set(px, py + 1, col, -1); }
    }
  };
  bell(0, 24, "v", true);            // the training distribution (ghost)
  bell(p.slide * 5, 24, "m", false); // the live data, sliding away
  if (p.slide) c.line(sx + sw / 2, sy + 6, sx + sw / 2 + p.slide * 5, sy + 6, "x", -1); // drift gauge
  for (let k = 0; k < 3; k++) c.rect(sx + sw - 3 - k * 3, sy + 4, 2, 2, k < p.slide ? "x" : "g", -1);
  // face on the bow log: lantern eyes
  const fy = 74 + dy;
  if (p.eye === "dead") {
    for (const sg of [-1, 1]) { c.line(cx + sg * 9 - 3, fy - 3, cx + sg * 9 + 3, fy + 3, "x", -1); c.line(cx + sg * 9 - 3, fy + 3, cx + sg * 9 + 3, fy - 3, "x", -1); }
  } else if (p.eye === "blink") {
    c.rect(cx - 13, fy, 8, 1, "y", -1); c.rect(cx + 6, fy, 8, 1, "y", -1);
  } else {
    const col = p.eye === "hurt" ? "x" : "y";
    for (const sg of [-1, 1]) { const ex = cx + sg * 9; c.disc(ex, fy, 5, 4, "e", -1); c.disc(ex + p.look, fy, 3, 3, col, -1); c.set(ex + p.look - 1, fy - 1, "w", -1); }
  }
  c.rect(cx - 5, fy + 6, 10, 2, "k", -1); // mouth seam
  // attack: spray of shifted points flung from the sail
  if (p.lunge) for (let k = 0; k < p.lunge * 3; k++) c.rect(sx + sw + 2 + k * 4, sy + 6 + (k % 3) * 9, 3, 3, k % 2 ? "m" : "v", -1);
  if (p.flash) for (const [ox, oy] of [[-24, 62], [20, 70], [0, 40]]) c.set(cx + ox, oy + dy, "w", -1);
  c.outline("k", "i", new Set(["n", "t", "v", "m", "g", "x", "y", "w", "e"]));
  return c.rows();
}
const P = (o) => ({ ...base, ...o });
const anims = {
  idle: [P({}), P({ dy: -1, slide: 1, ripple: 1, tilt: 1 }), P({ dy: -2, slide: 2, ripple: 2, look: 1 }), P({ dy: -1, slide: 1, ripple: 3, eye: "blink", tilt: -1 })].map(draw),
  attack: [P({ dy: 2, look: -1 }), P({ lunge: 1, slide: 2, look: 1, ripple: 1 }), P({ lunge: 2, slide: 3, flash: 1, ripple: 2 }), P({ lunge: 3, slide: 3, flash: 1, ripple: 3 }), P({ slide: 1 })].map(draw),
  hurt: [P({ dy: 1, eye: "hurt", flash: 1, tilt: 2 }), P({ eye: "hurt", look: -1, tilt: -2, slide: 1 }), P({ dy: 2, eye: "hurt" })].map(draw),
  faint: [P({ sink: 3, eye: "hurt", tilt: 2 }), P({ sink: 9, eye: "dead", tilt: 3, slide: 2 }), P({ sink: 16, eye: "dead", tilt: 4, slide: 3 }), P({ sink: 22, eye: "dead", tilt: 4, slide: 3 })].map(draw),
};

writeFileSync("game/sprites/creatures/drift.ts", toModule({
  id: "drift", name: "DRIFT", exportName: "DRIFT", w: W, h: H, palette: pal,
  doc: "Drift, the Recurrent Rapids boss. Front view, 96×96. A driftwood-raft spirit whose sail plots two bell curves: the faint training distribution and the live data sliding away from it (distribution drift).",
  fps: { idle: 4, attack: 7, hurt: 8, faint: 4 }, anims, generator: "scripts/art/rapids-boss.mjs",
}));
console.log("wrote drift");
