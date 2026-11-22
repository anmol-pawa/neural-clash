// Generates game/sprites/characters/{diver-pell,tidewatcher-sable}{,-portrait}.ts
// Two Attention Atoll trainers (original designs). Overworld 16x24 with idle, stand and 4-frame walk cycles; portraits 48x48 with idle/talk/smile/think.
//  - Diver Pell: pearl diver, wide sun hat with a coral band, teal wetsuit top, pink neckerchief, net of pearls.
//  - Tidewatcher Sable: tide-reader, sea-green robe, silver-white hair with a long side braid, a tide chart with five pearls.
import { writeFileSync } from "node:fs";
import { Canvas, toModule } from "./raster.mjs";

const base = { k: "#150f26", w: "#ffffff", i: "#1a1236", q: "#e8e2d0", r: "#9aa0b8" };
const rillPal = {
  ...base,
  a: "#7a1c34", b: "#b03050", c: "#e0506a", d: "#ff8a98", // sun-hat ramp (deep coral)
  e: "#7a4a30", f: "#a8704a", g: "#d49a70", h: "#f0c49a", // skin
  l: "#0a4a54", m: "#127484", n: "#2ca4b0", o: "#74dcd8", // teal wetsuit
  x: "#3a2a1c", y: "#e8e0cc", z: "#f4fcff", // boots, pearl-net cord, pale hat band
  p: "#2c3a4a", s: "#ff7ab0", t: "#b03a78", u: "#a84a4a", v: "#c8e8ff", // trousers, neckerchief, mouth
};
const wendPal = {
  ...base,
  a: "#6a7480", b: "#98a4b0", c: "#c8d2dc", d: "#eef4f8", // silver-white hair
  e: "#6a3e28", f: "#945a38", g: "#be8454", h: "#e4ac7c", // skin
  l: "#14503c", m: "#24805c", n: "#4cb88c", o: "#98ecc0", // sea-green robe
  p: "#1c2030", s: "#d8a838", t: "#5a3a1c", u: "#a8483a", v: "#fff0b0", // trousers, gold trim, brown, mouth
  x: "#14141c", y: "#e8dcc0", z: "#ff7ab0", // shoes, chart parchment, pearl pink
};
const SKIP = new Set();
const STEPS = [
  { l: 0, r: 0, bob: 0, arm: 0 },
  { l: -2, r: 1, bob: -1, arm: 1 },
  { l: 0, r: 0, bob: 0, arm: 0 },
  { l: 1, r: -2, bob: -1, arm: -1 },
];

function figure(who, dir, step) {
  const ranger = who === "tidewatcher-sable";
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
    c.rect(6 + st.l * f, 21, 4, 2, "x");
    c.rect(7 + st.r * f, legTop, 3, 4, "p");
    c.rect(6 + st.r * f, 21, 4, 2, "x");
  } else {
    c.rect(5, legTop, 3, 4 + (st.l < 0 ? -1 : 0), "p");
    c.rect(5, 21 + (st.l < 0 ? -1 : 0), 3, 2, "x");
    c.rect(8, legTop, 3, 4 + (st.r < 0 ? -1 : 0), "p");
    c.rect(8, 21 + (st.r < 0 ? -1 : 0), 3, 2, "x");
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
      c.rect(7, ty + 2, 2, 5, body[0]); // coat opening
      c.rect(10, ty + 4, 3, 3, "y"); // coiled rope on the hip
      c.set(11, ty + 5, "t", c.nextPart());
    }
  }
  const armY = ty + 1;
  if (side) {
    const f = dir === "left" ? -1 : 1;
    c.rect(7 + st.arm * f, armY, 2, 5, body[1]);
    c.rect(7 + st.arm * f, armY + 4, 2, 2, skin[2]);
    if (ranger) c.rect(7 + st.arm * f + (dir === "left" ? -1 : 1), armY + 3, 3, 4, "y"); // scroll
  } else {
    c.rect(2, armY + (st.arm > 0 ? 1 : 0), 2, 5, body[1]);
    c.rect(2, armY + 4 + (st.arm > 0 ? 1 : 0), 2, 2, skin[2]);
    c.rect(12, armY + (st.arm < 0 ? 1 : 0), 2, 5, body[1]);
    c.rect(12, armY + 4 + (st.arm < 0 ? 1 : 0), 2, 2, skin[2]);
    if (ranger && dir === "down") { c.rect(11, armY + 1, 4, 6, "y"); c.rect(11, armY + 1, 1, 6, "t"); c.rect(13, armY + 3, 1, 1, "z"); c.rect(12, armY + 4, 2, 1, "z"); } // looped scroll
  }
  if (dir === "up" && !ranger) { c.rect(5, ty + 2, 6, 4, "y"); } // rope coil from behind
  const hy = 5 + st.bob;
  c.ellipse(8, hy + 3, 4.6, 4.4, skin);
  if (ranger) {
    // dark cap of hair with a fringe and a long side braid tied with a gold bead
    if (dir === "up") c.ellipse(8, hy + 2.6, 5, 4.4, hair);
    else c.ellipse(8, hy + 1.2, 5, 3.2, hair);
    if (dir !== "up") c.rect(4, hy + 2, 8, 1, hair[1]);
    const bx = dir === "left" ? 3 : dir === "right" ? 11 : 12;
    c.rect(bx, hy + 4, 2, 7, hair[1]);
    c.set(bx, hy + 10, "s", c.nextPart());
    c.set(bx + 1, hy + 10, "s", c.nextPart());
  } else {
    // wide straw hat with a blue band, and a blue neckerchief
    if (dir === "up") c.ellipse(8, hy + 2.2, 5, 4, hair);
    else c.ellipse(8, hy + 0.8, 5, 3, hair);
    c.rect(1, hy + 2, 14, 1, hair[1]); // wide brim
    c.rect(3, hy + 1, 10, 1, "z"); // band
    c.rect(4, hy + 7, 8, 2, "s");
    c.rect(5, hy + 7, 3, 1, "t");
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
  const ranger = who === "tidewatcher-sable";
  const c = new Canvas(48, 48);
  const hair = ["a", "b", "c", "d"];
  const skin = ["e", "f", "g", "h"];
  const body = ["l", "m", "n", "o"];
  c.ellipse(24, 52, 22, 13, body);
  if (ranger) {
    c.line(24, 36, 24, 48, "l");
    c.rect(20, 36, 8, 2, "s"); // gold collar trim
    c.rect(33, 30, 13, 18, "y"); // looped scroll
    c.rect(33, 30, 2, 18, "t");
    c.rect(38, 35, 5, 5, "z");
    c.rect(39, 36, 3, 3, "y");
    c.rect(38, 43, 6, 1, "z");
  } else {
    c.ellipse(24, 40, 17, 5, body); // oilskin collar
    c.rect(20, 36, 8, 4, "s"); // blue neckerchief
    c.rect(22, 38, 3, 2, "t");
    c.ellipse(36, 44, 8, 5, ["t", "y", "y", "y"]); // coiled rope
    c.ellipse(36, 44, 3, 2, ["l", "l", "l", "l"]);
  }
  c.rect(20, 33, 8, 6, skin[1]);
  if (!ranger) {
    c.ellipse(24, 13, 16, 9, hair); // straw crown
    c.rect(24 - 22, 17, 44, 3, hair[1]); // wide brim
    c.rect(10, 14, 28, 3, "z"); // blue band
  }
  c.ellipse(24, 23, 13, 14.5, skin);
  c.ellipse(11, 25, 2.4, 3.4, skin);
  c.ellipse(37, 25, 2.4, 3.4, skin);
  if (ranger) {
    c.ellipse(24, 14, 14, 9, hair); // dark hair cap
    c.rect(12, 18, 24, 3, hair[1]); // fringe
    c.ellipse(11, 22, 3, 7, hair); // side hair
    c.ellipse(37, 22, 3, 7, hair);
    c.rect(38, 26, 4, 18, hair[1]); // long braid
    c.rect(38, 43, 4, 3, "s");
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
  c.line(14, 19 + bl[0], 21, 19 - bl[1], "c");
  c.line(27, 19 - bl[1], 34, 19 + bl[0], "c");
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
  ["diver-pell", "DIVER PELL", rillPal, "DIVER_PELL", "Diver Pell, a Attention Atoll trainer, overworld, 16×24: wide sun hat with a coral band, teal wetsuit top, pink neckerchief, net of pearls."],
  ["tidewatcher-sable", "TIDEWATCHER SABLE", wendPal, "TIDEWATCHER_SABLE", "Tidewatcher Sable, a Attention Atoll trainer, overworld, 16×24: sea-green robe, silver hair with a long braid, tide chart."],
];
for (const [id, name, pal, ex, doc] of defs) {
  writeFileSync(out + `${id}.ts`, toModule({ id, name, doc, exportName: ex, w: 16, h: 24, palette: pal, fps: ow, anims: charAnims(id), generator: "scripts/art/atoll-trainers.mjs" }));
  writeFileSync(
    out + `${id}-portrait.ts`,
    toModule({ id: `${id}-portrait`, name, doc: doc.replace("overworld, 16×24", "dialogue portrait, 48×48"), exportName: `${ex}_PORTRAIT`, w: 48, h: 48, palette: pal, fps: { idle: 3, talk: 6, smile: 2, think: 2 }, anims: portraitAnims(id), generator: "scripts/art/atoll-trainers.mjs" }),
  );
}
console.log("wrote atoll trainers");
