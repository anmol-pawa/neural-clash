// Generates game/sprites/creatures/leakage.ts and imbalance-swarm.ts (96x96 bosses, Metric Market).
// Leakage: a hooded phantom peeking over an answer sheet; answer-drops seep out of its hem.
// Imbalance Swarm: a heap of identical teal bugs hiding one tiny magenta minority bug ("99% accurate").
// Original designs.
import { writeFileSync } from "node:fs";
import { Canvas, toModule } from "./raster.mjs";

const W = 96, H = 96;

// ---------------- Leakage ----------------
const lp = {
  k: "#140c24", i: "#241640",
  a: "#3b2470", b: "#5b3aa6", c: "#8662d6", d: "#bba0f5", // cloak ramp
  q: "#9a8a6a", r: "#cdbf9c", s: "#efe6c8", u: "#fffaf0", // paper ramp
  t: "#27d6c4", n: "#9af7ff", g: "#3ddc84", x: "#ff4f6d", y: "#ffe27a", e: "#10081c", w: "#ffffff",
};
const CLOAK = ["a", "b", "c", "d"], PAPER = ["q", "r", "s", "u"];
const lbase = { dy: 0, eye: "open", look: 0, drip: 0, lunge: 0, flash: 0, sag: 0, fade: 0 };

function drawLeak(p) {
  const c = new Canvas(W, H), cx = 46, dy = p.dy;
  // seeping puddle of answer-drops
  c.ellipse(cx, 87, 30, 5, ["a", "b", "t", "n"], { part: c.nextPart() });
  // cloak: tall teardrop with a ragged hem
  const hemY = 84 - p.sag;
  c.ellipse(cx, 52 + dy + p.sag * 0.5, 26, 34 - p.sag * 0.4, CLOAK);
  for (let x = -26; x <= 26; x += 6) c.ellipse(cx + x, hemY - 2 + ((x / 6) & 1) * 3, 4, 5, CLOAK);
  // hood
  c.ellipse(cx, 26 + dy, 21, 19, CLOAK);
  c.disc(cx, 28 + dy, 15, 13, "e", -1);
  // peeking eye: big, pupil slides toward the sheet it is copying from
  if (p.eye === "dead") {
    for (const sg of [-1, 1]) { c.line(cx + sg * 7 - 3, 25 + dy, cx + sg * 7 + 3, 31 + dy, "x", -1); c.line(cx + sg * 7 - 3, 31 + dy, cx + sg * 7 + 3, 25 + dy, "x", -1); }
  } else if (p.eye === "blink") {
    c.rect(cx - 12, 28 + dy, 10, 1, "d", -1); c.rect(cx + 3, 28 + dy, 10, 1, "d", -1);
  } else {
    const col = p.eye === "hurt" ? "x" : "y";
    for (const sg of [-1, 1]) {
      const ex = cx + sg * 7;
      c.disc(ex, 28 + dy, 6, 5, "u", -1);
      c.disc(ex + p.look * 2, 28 + dy, 3, 3, col, -1);
      c.disc(ex + p.look * 2, 28 + dy, 1, 1, "k", -1);
    }
  }
  // the answer sheet it clutches: cream page with tick marks that leak out
  const sx = cx - 17 + p.lunge * 8, sy = 54 + dy;
  c.rect(sx, sy, 34, 24, "k", -1);
  c.rect(sx + 1, sy + 1, 32, 22, "s", -1);
  c.rect(sx + 1, sy + 1, 32, 3, "u", -1);
  c.rect(sx + 1, sy + 20, 32, 3, "r", -1);
  for (let row = 0; row < 3; row++) {
    const ry = sy + 6 + row * 5;
    c.rect(sx + 4, ry, 3, 2, "g", -1);                 // tick
    c.rect(sx + 9, ry, 17 - row * 3, 2, "q", -1);      // answer line
  }
  c.rect(sx + 24, sy - 4, 8, 6, "x", -1);              // "TEST" stamp corner
  c.set(sx + 26, sy - 2, "w", -1); c.set(sx + 29, sy - 2, "w", -1);
  // claws gripping the sheet
  for (const sg of [-1, 1]) for (let k = 0; k < 3; k++) c.rect(sx + (sg < 0 ? -2 : 33), sy + 6 + k * 5, 4, 3, "d", -1);
  // drips of leaked answers falling from the sheet and hem
  const dps = [[-10, 0], [2, 1], [12, 2], [-2, 3]];
  dps.forEach(([ox, ph], i) => {
    const y = sy + 24 + ((p.drip * 4 + ph * 3) % 12);
    c.rect(cx + ox, y, 2, 3, i % 2 ? "t" : "n", -1);
    c.set(cx + ox, y - 1, "t", -1);
  });
  if (p.lunge) for (let k = 0; k < 4; k++) c.rect(sx + 34 + k * 5, sy + 4 + (k % 2) * 8, 3, 3, k % 2 ? "t" : "g", -1);
  if (p.flash) for (const [ox, oy] of [[-18, 12], [16, 16], [0, 4]]) c.set(cx + ox, 28 + oy, "w", -1);
  c.outline("k", "i", new Set(["t", "n", "g", "x", "y", "w", "e"]));
  return c.rows();
}
const LP = (o) => ({ ...lbase, ...o });
const leakAnims = {
  idle: [LP({}), LP({ dy: -1, drip: 1, look: 1 }), LP({ dy: -2, drip: 2, look: 1 }), LP({ dy: -1, drip: 3, look: -1, eye: "blink" })].map(drawLeak),
  attack: [LP({ dy: 2, look: 1 }), LP({ lunge: 1, look: 1, drip: 1 }), LP({ lunge: 2, flash: 1, drip: 2 }), LP({ lunge: 1, flash: 1, drip: 3 }), LP({})].map(drawLeak),
  hurt: [LP({ dy: 1, eye: "hurt", flash: 1 }), LP({ eye: "hurt", look: -1 }), LP({ dy: 2, eye: "hurt" })].map(drawLeak),
  faint: [LP({ dy: 3, sag: 4, eye: "hurt" }), LP({ dy: 8, sag: 10, eye: "dead" }), LP({ dy: 14, sag: 18, eye: "dead", drip: 2 }), LP({ dy: 18, sag: 24, eye: "dead", drip: 3 })].map(drawLeak),
};

// ---------------- Imbalance Swarm ----------------
const sp = {
  k: "#06201f", i: "#0c3a38",
  a: "#0f5a56", b: "#16897f", c: "#27c2b0", d: "#7ff0dc", // majority ramp
  m: "#ff5fc8", n: "#ffc2ec", y: "#ffe27a", e: "#08161a", w: "#ffffff", x: "#ff4f6d", z: "#d7fff6",
};
const MAJ = ["a", "b", "c", "d"];
const sbase = { dy: 0, bob: 0, eye: "open", glow: 0, charge: 0, flash: 0, sink: 0 };
// fixed heap layout [x, y, r]; bigger bugs in front/below
const BUGS = [];
(() => {
  let s = 7; const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let row = 0; row < 7; row++) {
    const y = 80 - row * 8, half = 36 - row * 4.5;
    for (let x = -half; x <= half; x += 9) BUGS.push([Math.round(x + (rnd() - 0.5) * 3), Math.round(y + (rnd() - 0.5) * 3), 5 + (row < 3 ? 1 : 0)]);
  }
})();

function drawSwarm(p) {
  const c = new Canvas(W, H), cx = 47;
  c.ellipse(cx, 90, 40, 4, ["i", "a", "b", "b"], { part: c.nextPart() });
  BUGS.forEach(([ox, oy, r], i) => {
    const bob = Math.round(Math.sin(i * 1.7 + p.bob * 1.6) * (p.bob ? 1.5 : 0));
    const x = cx + ox * (1 + p.charge * 0.04), y = oy + bob + p.dy + p.sink * (1 + (i % 3) * 0.3);
    c.ellipse(x, y, r, r - 1, MAJ, { part: c.nextPart() });
    // two tiny eyes
    if (p.eye === "dead") { c.set(x - 2, y - 1, "x", -1); c.set(x + 2, y - 1, "x", -1); }
    else { c.set(x - 2, y - 1, "w", -1); c.set(x + 1, y - 1, "w", -1); c.set(x - 2, y, "e", -1); c.set(x + 1, y, "e", -1); }
    // antennae
    c.set(x - 2, y - r, "k", -1); c.set(x + 2, y - r, "k", -1);
  });
  // the minority: one small glowing magenta bug sheltered at the front of the heap
  const mx = cx + 1, my = 72 + p.dy + p.sink;
  c.disc(mx, my, 6 + p.glow, 6 + p.glow, "k", -1);
  c.disc(mx, my, 4.5 + p.glow, 4.5 + p.glow, p.flash ? "n" : "m", -1);
  c.disc(mx - 1.5, my - 1.5, 1.5, 1.5, "n", -1);
  c.set(mx - 2, my + 1, "e", -1); c.set(mx + 1, my + 1, "e", -1);
  // the big front bug is the boss face: wide toothy grin under a "99%" banner
  const fy = 36 + p.dy + p.sink;
  c.ellipse(cx, fy, 20, 15, MAJ);
  const eyeCol = p.eye === "hurt" ? "x" : "y";
  if (p.eye === "dead") { for (const sg of [-1, 1]) { c.line(cx + sg * 8 - 3, fy - 4, cx + sg * 8 + 3, fy + 2, "x", -1); c.line(cx + sg * 8 - 3, fy + 2, cx + sg * 8 + 3, fy - 4, "x", -1); } }
  else if (p.eye === "blink") { c.rect(cx - 12, fy - 2, 8, 1, "k", -1); c.rect(cx + 5, fy - 2, 8, 1, "k", -1); }
  else for (const sg of [-1, 1]) { c.disc(cx + sg * 8, fy - 3, 4, 4, "w", -1); c.disc(cx + sg * 8 + (p.charge ? sg : 0), fy - 3, 2, 2, eyeCol, -1); c.set(cx + sg * 8, fy - 3, "k", -1); }
  c.rect(cx - 9, fy + 5, 18, 5, "k", -1);
  for (let t = 0; t < 5; t++) c.rect(cx - 8 + t * 4, fy + 5, 2, 2, "w", -1);
  // accuracy banner
  c.rect(cx - 15, 8 + p.dy, 30, 10, "k", -1);
  c.rect(cx - 14, 9 + p.dy, 28, 8, "z", -1);
  // "99%" as pixel digits (3x5 glyphs)
  const G = { "9": ["111", "101", "111", "001", "111"], "%": ["101", "001", "010", "100", "101"] };
  [["9", -10], ["9", -5], ["%", 1]].forEach(([g, off]) => G[g].forEach((r, ry) => [...r].forEach((b, rx) => { if (b === "1") c.set(cx + off + rx, 10 + p.dy + ry, "k", -1); })));
  c.set(cx + 8, 16 + p.dy, "m", -1);
  if (p.charge) for (let k = 0; k < p.charge * 3; k++) c.rect(6 + k * 12, 84 - (k % 2) * 6, 3, 2, k % 2 ? "d" : "y", -1);
  if (p.flash) for (const [ox, oy] of [[-16, 6], [16, 8], [0, 0]]) c.set(cx + ox, 36 + oy, "w", -1);
  c.outline("k", "i", new Set(["w", "e", "y", "m", "n", "x", "z"]));
  return c.rows();
}
const SP = (o) => ({ ...sbase, ...o });
const swarmAnims = {
  idle: [SP({}), SP({ bob: 1, glow: 1 }), SP({ bob: 2, dy: -1, glow: 0 }), SP({ bob: 3, glow: 1, eye: "blink" })].map(drawSwarm),
  attack: [SP({ dy: 2, bob: 1 }), SP({ charge: 1, glow: 1 }), SP({ charge: 2, flash: 1, glow: 1 }), SP({ charge: 3, flash: 1 }), SP({ bob: 1 })].map(drawSwarm),
  hurt: [SP({ dy: 1, eye: "hurt", flash: 1 }), SP({ eye: "hurt", bob: 2 }), SP({ dy: 2, eye: "hurt" })].map(drawSwarm),
  faint: [SP({ sink: 2, eye: "hurt", bob: 1 }), SP({ sink: 6, eye: "dead", bob: 2 }), SP({ sink: 11, eye: "dead", bob: 3 }), SP({ sink: 15, eye: "dead", bob: 0 })].map(drawSwarm),
};

writeFileSync("game/sprites/creatures/leakage.ts", toModule({
  id: "leakage", name: "LEAKAGE", exportName: "LEAKAGE", w: W, h: H, palette: lp,
  doc: "Leakage, a Metric Market boss. Front view, 96×96. A hooded phantom peeking at a stolen answer sheet while answer-drops seep out of its hem: it sees the answers early.",
  fps: { idle: 4, attack: 7, hurt: 8, faint: 4 }, anims: leakAnims, generator: "scripts/art/market-bosses.mjs",
}));
writeFileSync("game/sprites/creatures/imbalance-swarm.ts", toModule({
  id: "imbalance-swarm", name: "IMBALANCE SWARM", exportName: "IMBALANCE_SWARM", w: W, h: H, palette: sp,
  doc: "Imbalance Swarm, a Metric Market boss. Front view, 96×96. A heap of identical teal bugs under a '99%' accuracy banner, hiding one tiny glowing magenta minority bug: the accuracy trap.",
  fps: { idle: 4, attack: 7, hurt: 8, faint: 4 }, anims: swarmAnims, generator: "scripts/art/market-bosses.mjs",
}));
console.log("wrote leakage, imbalance-swarm");
