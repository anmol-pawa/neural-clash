// Generates game/sprites/characters/{cadet-shear,ranger-axis}{,-portrait}.ts
// Two Vector Vale trainers (original designs). Overworld 16x24 with idle,
// stand and 4-frame walk cycles; portraits 48x48 with idle/talk/smile/think.
//  - Cadet Shear: lanky student, rose spiky hair, gold scarf, indigo jacket.
//  - Ranger Axis: older ranger, wide-brim green hat, moss coat, crystal lantern.
import { writeFileSync } from "node:fs";
import { Canvas, toModule } from "./raster.mjs";

const base = { k: "#150f26", w: "#ffffff", i: "#1a1236", q: "#e8e2d0", r: "#9aa0b8" };
const cadetPal = {
  ...base,
  a: "#6e1f4a", b: "#a3366d", c: "#d6558f", d: "#f58ab4", // rose hair ramp
  e: "#8a4f2e", f: "#b87445", g: "#dd9c66", h: "#f7c594", // skin
  l: "#232a6b", m: "#3a45a6", n: "#5f70d6", o: "#8fa0f2", // indigo jacket
  p: "#1b1e44", s: "#e8b83a", t: "#a8781c", u: "#c24a78", v: "#f7e08a", // trousers, gold scarf, mouth, scarf light
};
const rangerPal = {
  ...base,
  a: "#3d3a38", b: "#6b6764", c: "#9e9a96", d: "#d0ccc6", // grey stubble / hair
  e: "#5e3520", f: "#86512f", g: "#aa7344", h: "#cf9a68", // skin
  l: "#1d4a2c", m: "#2f7440", n: "#4ea35c", o: "#86d58a", // moss coat
  p: "#4a3524", s: "#58e0ff", t: "#1f8aa8", u: "#a8483a", v: "#d8f6ff", // boots-trousers, crystal, mouth
  x: "#3c2a18", y: "#5b4126", // hat brown ramp
};
const SKIP = new Set();
const STEPS = [
  { l: 0, r: 0, bob: 0, arm: 0 },
  { l: -2, r: 1, bob: -1, arm: 1 },
  { l: 0, r: 0, bob: 0, arm: 0 },
  { l: 1, r: -2, bob: -1, arm: -1 },
];

function figure(who, dir, step) {
  const ranger = who === "ranger-axis";
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
      c.rect(5, ty, 6, 2, "s"); // scarf
      c.rect(9, ty + 2, 2, 4, "s"); // scarf tail
      c.set(10, ty + 3, "v", c.nextPart());
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
    if (ranger && dir === "down") { c.rect(12, armY + 6, 3, 3, "t"); c.rect(13, armY + 7, 1, 1, "v"); } // crystal lantern
  }
  if (dir === "up" && !ranger) c.rect(4, ty, 8, 2, "s"); // scarf from behind
  const hy = 5 + st.bob;
  c.ellipse(8, hy + 3, 4.6, 4.4, skin);
  if (ranger) {
    if (dir === "up") c.ellipse(8, hy + 2.6, 5, 4.2, hair);
    else c.ellipse(8, hy + 2, 5, 2.4, hair);
    // wide-brim hat
    c.ellipse(8, hy + 0.5, 7.4, 2.2, ["x", "x", "y", "y"]);
    c.ellipse(8, hy - 1, 4, 2.6, ["x", "y", "y", "y"]);
    c.rect(5, hy - 1, 6, 1, "s");
  } else {
    if (dir === "up") c.ellipse(8, hy + 2.6, 5, 4.6, hair);
    else c.ellipse(8, hy + 1.2, 5, 3, hair);
    for (const x of [3, 6, 9, 12]) c.disc(x, hy - 1, 1.3, 2, hair[x % 2 ? 3 : 2]); // spikes
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
  const ranger = who === "ranger-axis";
  const c = new Canvas(48, 48);
  const hair = ["a", "b", "c", "d"];
  const skin = ["e", "f", "g", "h"];
  const body = ["l", "m", "n", "o"];
  c.ellipse(24, 52, 22, 13, body);
  if (ranger) {
    c.line(24, 36, 24, 48, "l");
    c.rect(32, 41, 9, 7, "t"); // lantern
    c.rect(34, 42, 5, 5, "s");
    c.set(35, 43, "v", c.nextPart());
  } else {
    c.ellipse(24, 40, 14, 4, ["t", "s", "s", "v"]); // scarf
    c.rect(28, 40, 6, 8, "s");
    c.line(31, 41, 31, 47, "t");
  }
  c.rect(20, 33, 8, 6, skin[1]);
  if (ranger) {
    c.ellipse(24, 22, 14, 14, hair);
  } else {
    for (const [x, y, r] of [[12, 12, 5], [18, 5, 5], [25, 3, 5], [32, 5, 5], [37, 12, 5], [14, 18, 5], [35, 19, 4]]) c.ellipse(x, y, r, r, hair);
  }
  c.ellipse(24, 23, 13, 14.5, skin);
  c.ellipse(11, 25, 2.4, 3.4, skin);
  c.ellipse(37, 25, 2.4, 3.4, skin);
  if (ranger) {
    c.ellipse(24, 14, 13, 4, hair);
    c.ellipse(16, 30, 6, 4, hair); // stubble
    c.ellipse(32, 30, 6, 4, hair);
    c.ellipse(24, 33, 7, 2.5, skin);
    c.ellipse(24, 11, 21, 4.5, ["x", "x", "y", "y"]); // brim
    c.ellipse(24, 5, 12, 7, ["x", "y", "y", "y"]); // crown
    c.rect(13, 8, 22, 2, "s");
  } else {
    c.ellipse(24, 13, 14, 6, hair);
    for (const [x, y] of [[16, 15], [22, 14], [28, 14], [33, 16]]) c.disc(x, y, 3, 3, hair[2]);
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
  ["cadet-shear", "CADET SHEAR", cadetPal, "CADET_SHEAR", "Cadet Shear, a Vector Vale trainer, overworld, 16×24: rose spiky hair, gold scarf, indigo jacket."],
  ["ranger-axis", "RANGER AXIS", rangerPal, "RANGER_AXIS", "Ranger Axis, a Vector Vale trainer, overworld, 16×24: wide-brim hat, moss coat, crystal lantern."],
];
for (const [id, name, pal, ex, doc] of defs) {
  writeFileSync(out + `${id}.ts`, toModule({ id, name, doc, exportName: ex, w: 16, h: 24, palette: pal, fps: ow, anims: charAnims(id), generator: "scripts/art/vale-trainers.mjs" }));
  writeFileSync(
    out + `${id}-portrait.ts`,
    toModule({ id: `${id}-portrait`, name, doc: doc.replace("overworld, 16×24", "dialogue portrait, 48×48"), exportName: `${ex}_PORTRAIT`, w: 48, h: 48, palette: pal, fps: { idle: 3, talk: 6, smile: 2, think: 2 }, anims: portraitAnims(id), generator: "scripts/art/vale-trainers.mjs" }),
  );
}
console.log("wrote vale trainers");
