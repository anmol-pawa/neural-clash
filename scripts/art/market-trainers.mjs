// Generates game/sprites/characters/{botanist-fern,forester-birch}{,-portrait}.ts
// Two Metric Market trainers (original designs). Overworld 16x24 with idle,
// stand and 4-frame walk cycles; portraits 48x48 with idle/talk/smile/think.
//  - Vendor Pip: young fruit vendor, violet beret with a cream stripe, teal shirt, orange neckerchief, freckles.
//  - Appraiser Lode: older appraiser, plum robe, purple skullcap with a gold button, round gold spectacles, white beard, ledger.
import { writeFileSync } from "node:fs";
import { Canvas, toModule } from "./raster.mjs";

const base = { k: "#150f26", w: "#ffffff", i: "#1a1236", q: "#e8e2d0", r: "#9aa0b8" };
const pipPal = {
  ...base,
  a: "#14142a", b: "#26264a", c: "#3e3e6c", d: "#5a5a90",
  e: "#6a3e28", f: "#8e5a3a", g: "#b07c52", h: "#d29c70",
  l: "#0e4a52", m: "#1a7a82", n: "#2eaab0", o: "#7adcd8",
  x: "#7a3ac0", y: "#f4ecd2",
  p: "#3a2c2c", s: "#e8801e", t: "#a85a0e", u: "#b84a4a", v: "#ffc060",
};
const lodePal = {
  ...base,
  a: "#8a8a98", b: "#b0b0be", c: "#d4d4e0", d: "#f4f4fa",
  e: "#6a3e28", f: "#945a38", g: "#be8454", h: "#e4ac7c",
  l: "#3a1a4e", m: "#5e2e7e", n: "#8450a8", o: "#b88ad8",
  p: "#2a2030", s: "#5a2a8a", t: "#2e1448", u: "#a8483a", v: "#e8c24a",
  x: "#2a2420", y: "#f4ecd2",
};
const SKIP = new Set();
const STEPS = [
  { l: 0, r: 0, bob: 0, arm: 0 },
  { l: -2, r: 1, bob: -1, arm: 1 },
  { l: 0, r: 0, bob: 0, arm: 0 },
  { l: 1, r: -2, bob: -1, arm: -1 },
];

function figure(who, dir, step) {
  const ranger = who === "appraiser-lode";
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
    if (ranger) c.rect(5, ty + tlen - 2, 6, 2, body[1]); // coat skirt
  } else {
    c.ellipse(8, ty + tlen / 2, 5.4, tlen / 2 + 0.6, body);
    if (ranger) c.rect(4, ty + tlen - 2, 8, 2, body[1]);
  }
  if (dir === "down") {
    if (ranger) c.line(8, ty + 1, 8, ty + tlen - 1, body[0]);
    else {
      c.rect(4, ty + 3, 8, 4, "s"); // orange apron bib
      c.rect(5, ty + 3, 6, 1, "v");
    }
  }
  const armY = ty + 1;
  if (side) {
    const f = dir === "left" ? -1 : 1;
    c.rect(7 + st.arm * f, armY, 2, 5, body[1]);
    c.rect(7 + st.arm * f, armY + 4, 2, 2, skin[2]);
    if (ranger) c.rect(7 + st.arm * f + (dir === "left" ? -1 : 1), armY + 4, 3, 4, "y");
  } else {
    c.rect(2, armY + (st.arm > 0 ? 1 : 0), 2, 5, body[1]);
    c.rect(2, armY + 4 + (st.arm > 0 ? 1 : 0), 2, 2, skin[2]);
    c.rect(12, armY + (st.arm < 0 ? 1 : 0), 2, 5, body[1]);
    c.rect(12, armY + 4 + (st.arm < 0 ? 1 : 0), 2, 2, skin[2]);
    if (ranger && dir === "down") { c.rect(11, armY + 1, 4, 6, "y"); c.rect(12, armY + 2, 2, 1, "r"); c.rect(12, armY + 4, 2, 1, "r"); } // ledger
  }
  if (dir === "up" && !ranger) { c.rect(5, ty + 3, 6, 3, "s"); } // apron strings from behind
  const hy = 5 + st.bob;
  c.ellipse(8, hy + 3, 4.6, 4.4, skin);
  if (ranger) {
    if (dir === "up") c.ellipse(8, hy + 2.6, 5, 4.2, hair);
    else c.ellipse(8, hy + 2, 5, 2.4, hair);
    // purple skullcap with a gold button, white beard
    c.ellipse(8, hy - 0.4, 4.8, 3.2, ["t", "s", "s", "m"]);
    c.rect(7, hy - 3, 2, 1, "v");
    c.rect(3, hy + 0.5, 10, 1, "t");
    if (dir === "down") c.rect(5, hy + 5, 6, 1, "c");
  } else {
    if (dir === "up") c.ellipse(8, hy + 2.6, 5, 4.6, hair);
    else c.ellipse(8, hy + 1.2, 5, 3, hair);
    c.ellipse(8, hy - 0.2, 6.4, 3.0, ["x", "x", "x", "x"]); // violet beret
    c.rect(5, hy - 2, 2, 3, "y"); // cream stripe
    c.set(8, hy - 3, "x", c.nextPart());
    c.rect(3, hy + 3, 2, 3, hair[1]);
    c.rect(11, hy + 3, 2, 3, hair[1]);
    c.rect(4, hy + 7, 8, 2, "s"); // orange neckerchief
    c.rect(5, hy + 7, 3, 1, "v");
  }
  if (dir === "down") {
    c.rect(5, hy + 3, 2, 2, "w");
    c.rect(9, hy + 3, 2, 2, "w");
    c.set(6, hy + 4, "i", c.nextPart());
    c.set(10, hy + 4, "i", c.nextPart());
    c.set(7, hy + 6, "u", c.nextPart());
    c.set(8, hy + 6, "u", c.nextPart());
    if (!ranger) { c.set(5, hy + 5, "e", c.nextPart()); c.set(10, hy + 5, "e", c.nextPart()); } // freckles
    else { c.rect(4, hy + 2, 4, 1, "v"); c.rect(9, hy + 2, 4, 1, "v"); c.rect(4, hy + 5, 4, 1, "v"); c.rect(9, hy + 5, 4, 1, "v"); } // gold spectacles
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
  const ranger = who === "appraiser-lode";
  const c = new Canvas(48, 48);
  const hair = ["a", "b", "c", "d"];
  const skin = ["e", "f", "g", "h"];
  const body = ["l", "m", "n", "o"];
  c.ellipse(24, 52, 22, 13, body);
  if (ranger) {
    c.line(24, 36, 24, 48, "l");
    c.rect(33, 32, 13, 16, "y"); // ledger
    c.rect(35, 35, 9, 1, "r");
    c.rect(35, 38, 9, 1, "r");
    c.rect(35, 41, 6, 1, "r");
  } else {
    c.rect(12, 38, 24, 10, "s"); // orange apron bib
    c.rect(12, 38, 24, 1, "v");
    c.rect(18, 42, 12, 5, "t"); // pocket
    c.rect(14, 36, 20, 3, "s"); // neckerchief
  }
  c.rect(20, 33, 8, 6, skin[1]);
  if (ranger) {
    c.ellipse(24, 22, 14, 14, hair);
  } else {

  }
  c.ellipse(24, 23, 13, 14.5, skin);
  c.ellipse(11, 25, 2.4, 3.4, skin);
  c.ellipse(37, 25, 2.4, 3.4, skin);
  if (ranger) {
    c.ellipse(24, 14, 13, 4, hair);
    c.ellipse(15, 29, 3, 6, hair); // grey sideburns
    c.ellipse(33, 29, 3, 6, hair);
    c.ellipse(24, 12, 16, 4, ["t", "s", "s", "s"]); // cap band
    c.ellipse(24, 6, 13, 8, ["t", "s", "s", "m"]); // skullcap
    c.ellipse(24, 0, 2, 2, ["v", "v", "v", "v"]); // gold button
    c.rect(7, 9, 34, 3, "t"); // brim
    c.ellipse(24, 36, 9, 5, hair); // beard
    c.ellipse(24, 33, 8, 2.4, hair); // moustache
  } else {
    c.ellipse(24, 15, 14, 6, hair); // fringe
    c.ellipse(24, 8, 19, 7, ["x", "x", "x", "x"]); // violet beret
    c.rect(16, 3, 4, 8, "y"); // cream stripe
    c.ellipse(24, 1, 2, 2, ["x", "x", "x", "x"]);
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
  if (ranger) { for (const ex of [18, 30]) { c.ellipse(ex, ey, 5.4, 5, ["v", "v", "v", "v"]); c.ellipse(ex, ey, 3.8, 3.6, ["w", "w", "w", "w"]); c.disc(ex, ey + 0.5, 1.9, 2.1, "i"); } c.line(23, ey, 25, ey, "v"); } // gold round spectacles
  if (!ranger) { for (const ex of [14, 17, 31, 34]) c.set(ex, ey + 5, "e", c.nextPart()); } // freckles
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
  ["vendor-pip", "VENDOR PIP", pipPal, "VENDOR_PIP", "Vendor Pip, a Metric Market trainer, overworld, 16×24: violet beret with a cream stripe, teal shirt, orange apron and neckerchief, freckles."],
  ["appraiser-lode", "APPRAISER LODE", lodePal, "APPRAISER_LODE", "Appraiser Lode, a Metric Market trainer, overworld, 16×24: purple skullcap with a gold button, round gold spectacles, white beard, plum robe, ledger."],
];
for (const [id, name, pal, ex, doc] of defs) {
  writeFileSync(out + `${id}.ts`, toModule({ id, name, doc, exportName: ex, w: 16, h: 24, palette: pal, fps: ow, anims: charAnims(id), generator: "scripts/art/market-trainers.mjs" }));
  writeFileSync(
    out + `${id}-portrait.ts`,
    toModule({ id: `${id}-portrait`, name, doc: doc.replace("overworld, 16×24", "dialogue portrait, 48×48"), exportName: `${ex}_PORTRAIT`, w: 48, h: 48, palette: pal, fps: { idle: 3, talk: 6, smile: 2, think: 2 }, anims: portraitAnims(id), generator: "scripts/art/market-trainers.mjs" }),
  );
}
console.log("wrote market trainers");
