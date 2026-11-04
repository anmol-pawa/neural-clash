// Generates game/sprites/characters/{climber-delta,surveyor-hess}{,-portrait}.ts
// Two Gradient Gorge trainers (original designs). Overworld 16x24 with idle,
// stand and 4-frame walk cycles; portraits 48x48 with idle/talk/smile/think.
//  - Climber Delta: young climber, teal headband and ponytail, sand jacket, rope coil.
//  - Surveyor Hess: older surveyor, orange hard hat, hi-vis vest, level-staff with a flag.
import { writeFileSync } from "node:fs";
import { Canvas, toModule } from "./raster.mjs";

const base = { k: "#150f26", w: "#ffffff", i: "#1a1236", q: "#e8e2d0", r: "#9aa0b8" };
const climberPal = {
  ...base,
  a: "#2a1a14", b: "#4a2e22", c: "#6e4632", d: "#8e6044", // dark brown hair ramp
  e: "#7a4a2e", f: "#a8693f", g: "#cf8f5c", h: "#f0b88a", // skin
  l: "#7a5c3a", m: "#a98350", n: "#d2b074", o: "#ecd49c", // sand jacket
  x: "#f4ecd8", y: "#9a7a4a", // rope cream and rope shadow
  p: "#2c3a4a", s: "#1fb5b0", t: "#0d7a78", u: "#b84a4a", v: "#9af0e8", // trousers, teal headband, mouth, band light
};
const surveyorPal = {
  ...base,
  a: "#4a4a52", b: "#74747e", c: "#a4a4ae", d: "#d4d4dc", // grey hair
  e: "#6a3e28", f: "#945a38", g: "#be8454", h: "#e4ac7c", // skin
  l: "#a8420f", m: "#d8641c", n: "#ff8a3a", o: "#ffc07a", // hi-vis orange vest
  p: "#3c3c4c", s: "#ffd23a", t: "#c79a14", u: "#a8483a", v: "#fff0a8", // trousers, hard-hat yellow, mouth
  x: "#2a2420", y: "#5a4a3c", // boots and staff brown
};
const SKIP = new Set();
const STEPS = [
  { l: 0, r: 0, bob: 0, arm: 0 },
  { l: -2, r: 1, bob: -1, arm: 1 },
  { l: 0, r: 0, bob: 0, arm: 0 },
  { l: 1, r: -2, bob: -1, arm: -1 },
];

function figure(who, dir, step) {
  const ranger = who === "surveyor-hess";
  const c = new Canvas(16, 24);
  const st = STEPS[step];
  const hair = ranger ? ["a", "b", "c", "d"] : ["a", "b", "c", "d"];
  const skin = ranger ? ["e", "f", "g", "h"] : ["e", "f", "g", "h"];
  const body = ["l", "m", "n", "o"];
  const side = dir === "left" || dir === "right";
  const legTop = ranger ? 18 : 17;
  if (side) {
    const f = dir === "left" ? -1 : 1;
    c.rect(7 + st.l * f, legTop, 3, 4, "p");
    c.rect(6 + st.l * f, 21, 4, 2, ranger ? "x" : "q");
    c.rect(7 + st.r * f, legTop, 3, 4, "p");
    c.rect(6 + st.r * f, 21, 4, 2, ranger ? "x" : "q");
  } else {
    c.rect(5, legTop, 3, 4 + (st.l < 0 ? -1 : 0), "p");
    c.rect(5, 21 + (st.l < 0 ? -1 : 0), 3, 2, ranger ? "x" : "q");
    c.rect(8, legTop, 3, 4 + (st.r < 0 ? -1 : 0), "p");
    c.rect(8, 21 + (st.r < 0 ? -1 : 0), 3, 2, ranger ? "x" : "q");
  }
  const ty = 11 + st.bob;
  const tlen = ranger ? 9 : 7;
  if (side) {
    c.ellipse(8, ty + tlen / 2, 4.2, tlen / 2 + 0.6, body);
    if (ranger) c.rect(5, ty + tlen - 2, 6, 2, body[1]);
  } else {
    c.ellipse(8, ty + tlen / 2, 5.4, tlen / 2 + 0.6, body);
    if (ranger) c.rect(4, ty + tlen - 2, 8, 2, body[1]);
  }
  if (dir === "down") {
    if (ranger) c.line(8, ty + 1, 8, ty + tlen - 1, body[0]);
    else {
      for (const [x, y] of [[4, 0], [5, 1], [6, 2], [7, 3], [8, 4], [9, 5]]) c.rect(x, ty + y, 2, 1, "x"); // rope sash
      c.set(6, ty + 2, "y", c.nextPart());
      c.set(9, ty + 5, "y", c.nextPart());
    }
  }
  const armY = ty + 1;
  if (side) {
    const f = dir === "left" ? -1 : 1;
    c.rect(7 + st.arm * f, armY, 2, 5, body[1]);
    c.rect(7 + st.arm * f, armY + 4, 2, 2, skin[2]);
    if (ranger) { c.rect(7 + st.arm * f + (dir === "left" ? -1 : 1), armY + 5, 2, 3, "s"); }
  } else {
    c.rect(2, armY + (st.arm > 0 ? 1 : 0), 2, 5, body[1]);
    c.rect(2, armY + 4 + (st.arm > 0 ? 1 : 0), 2, 2, skin[2]);
    c.rect(12, armY + (st.arm < 0 ? 1 : 0), 2, 5, body[1]);
    c.rect(12, armY + 4 + (st.arm < 0 ? 1 : 0), 2, 2, skin[2]);
    if (ranger && dir === "down") { c.rect(14, armY - 3, 1, 12, "y"); c.rect(11, armY - 3, 3, 3, "n"); c.set(12, armY - 2, "o", c.nextPart()); } // level-staff with flag
  }
  if (dir === "up" && !ranger) { c.rect(5, ty + 1, 6, 5, "y"); c.rect(6, ty + 2, 4, 3, "x"); } // rope coil pack from behind
  const hy = 5 + st.bob;
  c.ellipse(8, hy + 3, 4.6, 4.4, skin);
  if (ranger) {
    if (dir === "up") c.ellipse(8, hy + 2.6, 5, 4.2, hair);
    else c.ellipse(8, hy + 2, 5, 2.4, hair);
    // hard hat
    c.ellipse(8, hy + 0.3, 6.4, 1.6, ["t", "t", "s", "s"]);
    c.ellipse(8, hy - 0.6, 4.6, 3.2, ["t", "s", "s", "v"]);
    c.rect(7, hy - 3, 2, 3, "t");
  } else {
    if (dir === "up") c.ellipse(8, hy + 2.6, 5, 4.6, hair);
    else c.ellipse(8, hy + 1.2, 5, 3, hair);
    c.rect(3, hy + 1, 10, 2, "s"); // headband
    c.rect(4, hy + 1, 3, 1, "v");
    if (dir === "up" || dir === "left" || dir === "right") { c.rect(dir === "right" ? 2 : 11, hy + 3, 3, 4, hair[1]); c.rect(dir === "right" ? 1 : 12, hy + 6, 3, 3, hair[2]); } // ponytail
    else c.rect(11, hy + 3, 2, 5, hair[1]);
  }
  if (dir === "down") {
    c.rect(5, hy + 3, 2, 2, "w");
    c.rect(9, hy + 3, 2, 2, "w");
    c.set(6, hy + 4, "i", c.nextPart());
    c.set(10, hy + 4, "i", c.nextPart());
    c.set(7, hy + 6, "u", c.nextPart());
    c.set(8, hy + 6, "u", c.nextPart());
  } else if (side) {
    const ex = dir === "left" ? 5 : 10;
    c.rect(ex, hy + 3, 2, 2, "w");
    c.set(dir === "left" ? ex : ex + 1, hy + 4, "i", c.nextPart());
  }
  c.outline("k", null, SKIP);
  return c.rows();
}

function shiftUp(rows) {
  return rows.map((r, y) => (y < 19 ? rows[y + 1] : r));
}

function charAnims(who) {
  const anims = {};
  for (const dir of ["down", "up", "left", "right"]) {
    anims[`walk-${dir}`] = [0, 1, 2, 3].map((s) => figure(who, dir, s));
    anims[`stand-${dir}`] = [figure(who, dir, 0), shiftUp(figure(who, dir, 0))];
  }
  anims.idle = anims["stand-down"];
  return anims;
}

function portrait(who, mood) {
  const ranger = who === "surveyor-hess";
  const c = new Canvas(48, 48);
  const hair = ["a", "b", "c", "d"];
  const skin = ["e", "f", "g", "h"];
  const body = ["l", "m", "n", "o"];
  c.ellipse(24, 52, 22, 13, body);
  if (ranger) {
    c.line(24, 36, 24, 48, "l");
    c.rect(36, 18, 2, 30, "y"); // level-staff
    c.rect(38, 18, 8, 6, "n"); // flag
    c.rect(38, 18, 8, 1, "o");
  } else {
    for (let i = 0; i < 6; i++) c.rect(12 + i * 4, 39 + i, 6, 2, "x"); // rope sash
    c.rect(26, 43, 3, 2, "y");
  }
  c.rect(20, 33, 8, 6, skin[1]);
  if (ranger) {
    c.ellipse(24, 22, 14, 14, hair);
  } else {
    c.ellipse(36, 22, 5, 11, hair); // ponytail
    c.ellipse(38, 33, 4, 6, hair);
    for (const [x, y, r] of [[13, 13, 5], [20, 7, 6], [28, 7, 6], [35, 13, 5], [13, 20, 4]]) c.ellipse(x, y, r, r, hair);
  }
  c.ellipse(24, 23, 13, 14.5, skin);
  c.ellipse(11, 25, 2.4, 3.4, skin);
  c.ellipse(37, 25, 2.4, 3.4, skin);
  if (ranger) {
    c.ellipse(24, 14, 13, 4, hair);
    c.ellipse(15, 29, 3, 6, hair); // grey sideburns
    c.ellipse(33, 29, 3, 6, hair);
    c.ellipse(24, 11, 17, 4, ["t", "s", "s", "s"]); // hard-hat brim
    c.ellipse(24, 6, 13, 8, ["t", "s", "s", "v"]); // dome
    c.rect(22, 0, 4, 9, "t"); // centre ridge
    c.rect(21, 3, 6, 2, "v");
  } else {
    c.ellipse(24, 13, 14, 6, hair);
    c.rect(10, 14, 28, 4, "s"); // teal headband
    c.rect(13, 14, 8, 1, "v");
    c.rect(34, 14, 4, 6, "t");
  }
  const blink = mood === "blink";
  const ey = 24;
  for (const ex of [18, 30]) {
    if (blink) c.line(ex - 3, ey + 1, ex + 3, ey + 1, "k");
    else {
      c.ellipse(ex, ey, 3.6, 3.2, ["w", "w", "w", "w"]);
      c.disc(ex + (mood === "think" ? 1 : 0), ey + 0.5, 1.9, 2.1, "i");
      c.set(ex - 0.5, ey - 1, "w", c.nextPart());
    }
  }
  const bl = mood === "think" ? [-1, 1] : [0, 0];
  c.line(14, 19 + bl[0], 21, 19 - bl[1], ranger ? "c" : "a");
  c.line(27, 19 - bl[1], 34, 19 + bl[0], ranger ? "c" : "a");
  c.line(24, 27, 23, 30, skin[0]);
  if (mood === "talk") {
    c.ellipse(24, 34, 3.2, 2.2, ["u", "u", "u", "u"]);
    c.rect(22, 33, 5, 1, "w");
  } else {
    c.line(21, 34, 27, 34, "u");
    if (mood === "smile") { c.set(20, 33, "u", c.nextPart()); c.set(28, 33, "u", c.nextPart()); }
  }
  c.outline("k", null, SKIP);
  return c.rows();
}

const portraitAnims = (who) => ({
  idle: [portrait(who, "neutral"), portrait(who, "neutral"), portrait(who, "blink"), portrait(who, "neutral")],
  talk: [portrait(who, "neutral"), portrait(who, "talk")],
  smile: [portrait(who, "smile"), portrait(who, "smile")],
  think: [portrait(who, "think"), portrait(who, "think")],
});

const out = "game/sprites/characters/";
const ow = { idle: 2, "stand-down": 2, "stand-up": 2, "stand-left": 2, "stand-right": 2, "walk-down": 8, "walk-up": 8, "walk-left": 8, "walk-right": 8 };
const defs = [
  ["climber-delta", "CLIMBER DELTA", climberPal, "CLIMBER_DELTA", "Climber Delta, a Gradient Gorge trainer, overworld, 16×24: teal headband, ponytail, sand jacket, rope coil."],
  ["surveyor-hess", "SURVEYOR HESS", surveyorPal, "SURVEYOR_HESS", "Surveyor Hess, a Gradient Gorge trainer, overworld, 16×24: orange hard hat, hi-vis vest, level-staff with a flag."],
];
for (const [id, name, pal, ex, doc] of defs) {
  writeFileSync(out + `${id}.ts`, toModule({ id, name, doc, exportName: ex, w: 16, h: 24, palette: pal, fps: ow, anims: charAnims(id), generator: "scripts/art/vale-trainers.mjs" }));
  writeFileSync(
    out + `${id}-portrait.ts`,
    toModule({ id: `${id}-portrait`, name, doc: doc.replace("overworld, 16×24", "dialogue portrait, 48×48"), exportName: `${ex}_PORTRAIT`, w: 48, h: 48, palette: pal, fps: { idle: 3, talk: 6, smile: 2, think: 2 }, anims: portraitAnims(id), generator: "scripts/art/vale-trainers.mjs" }),
  );
}
console.log("wrote gorge trainers");
