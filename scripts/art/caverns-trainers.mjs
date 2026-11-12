// Generates game/sprites/characters/{delver-kern,lensmith-oriel}{,-portrait}.ts
// Two Conv Caverns trainers (original designs). Overworld 16x24 with idle, stand and 4-frame walk cycles; portraits 48x48 with idle/talk/smile/think.
//  - Delver Kern: young cave surveyor, yellow hard hat with a teal crystal lamp, slate vest over a cream shirt, red neckerchief.
//  - Lensmith Oriel: elder lens-grinder, silver bun, round brass spectacles, teal cloak, no beard.
import { writeFileSync } from "node:fs";
import { Canvas, toModule } from "./raster.mjs";

const base = { k: "#150f26", w: "#ffffff", i: "#1a1236", q: "#e8e2d0", r: "#9aa0b8" };
const kernPal = {
  ...base,
  a: "#7a4a08", b: "#c48a10", c: "#f0c020", d: "#fff07a", // yellow hard-hat ramp
  e: "#7a4a30", f: "#a8704a", g: "#d49a70", h: "#f0c49a", // skin
  l: "#1c2c3a", m: "#34506a", n: "#5a86a8", o: "#8cbcd8", // slate vest
  x: "#f4ecd2", y: "#8a6a3a", z: "#5ef0e0", // cream shirt, satchel, crystal lamp
  p: "#3a2a1c", s: "#d84a3a", t: "#8a1c1c", u: "#a84a4a", v: "#c8fff0", // trousers, neckerchief, mouth, lamp glint
};
const orielPal = {
  ...base,
  a: "#8a8aa0", b: "#b4b4cc", c: "#d8d8ec", d: "#f4f4ff", // silver hair
  e: "#6a3e28", f: "#945a38", g: "#be8454", h: "#e4ac7c", // skin
  l: "#0e4a4a", m: "#1a7a7a", n: "#32aaa8", o: "#7adcd4", // teal cloak
  p: "#1c2030", s: "#d8a838", t: "#5a3a1c", u: "#a8483a", v: "#fff0b0", // trousers, brass, brown trim, mouth
  x: "#14141c", y: "#4a6a8a", z: "#d8a838", // shoes, lens-case, brass spectacles
};
const SKIP = new Set();
const STEPS = [
  { l: 0, r: 0, bob: 0, arm: 0 },
  { l: -2, r: 1, bob: -1, arm: 1 },
  { l: 0, r: 0, bob: 0, arm: 0 },
  { l: 1, r: -2, bob: -1, arm: -1 },
];

function figure(who, dir, step) {
  const ranger = who === "lensmith-oriel";
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
      c.rect(4, ty, 8, 2, "x"); // cream blouse collar
      c.rect(7, ty + 2, 2, 5, "x"); // blouse front under the vest
      c.rect(7, ty + 2, 1, 5, "s"); // price-tag ribbon
    }
  }
  const armY = ty + 1;
  if (side) {
    const f = dir === "left" ? -1 : 1;
    c.rect(7 + st.arm * f, armY, 2, 5, body[1]);
    c.rect(7 + st.arm * f, armY + 4, 2, 2, skin[2]);
    if (ranger) c.rect(7 + st.arm * f + (dir === "left" ? -1 : 1), armY + 3, 3, 4, "y"); // ledger
  } else {
    c.rect(2, armY + (st.arm > 0 ? 1 : 0), 2, 5, body[1]);
    c.rect(2, armY + 4 + (st.arm > 0 ? 1 : 0), 2, 2, skin[2]);
    c.rect(12, armY + (st.arm < 0 ? 1 : 0), 2, 5, body[1]);
    c.rect(12, armY + 4 + (st.arm < 0 ? 1 : 0), 2, 2, skin[2]);
    if (ranger && dir === "down") { c.rect(11, armY + 1, 4, 6, "y"); c.rect(11, armY + 1, 1, 6, "t"); c.rect(13, armY + 3, 1, 1, "v"); } // ledger
  }
  if (dir === "up" && !ranger) { c.rect(4, ty, 8, 1, "x"); c.rect(5, ty + 2, 6, 4, "y"); } // collar and satchel from behind
  const hy = 5 + st.bob;
  c.ellipse(8, hy + 3, 4.6, 4.4, skin);
  if (ranger) {
    if (dir === "up") c.ellipse(8, hy + 2.6, 5, 4.2, hair);
    else c.ellipse(8, hy + 2, 5, 2.4, hair);
    // bald crown with white side hair and a neat moustache
    c.ellipse(8, hy + 0.4, 4.2, 2.2, skin);
    c.rect(3, hy + 2, 2, 4, "b");
    c.rect(11, hy + 2, 2, 4, "b");
    if (dir === "up") c.ellipse(8, hy + 3.4, 4.4, 3.2, hair);
    c.ellipse(8, hy - 1.4, 2.6, 2, hair); // silver bun
    if (dir === "down") { c.rect(4, hy + 2, 3, 1, "z"); c.rect(9, hy + 2, 3, 1, "z"); c.rect(7, hy + 3, 2, 1, "z"); } // spectacle bridge
  } else {
    if (dir === "up") c.ellipse(8, hy + 2.6, 5, 4.6, hair);
    else c.ellipse(8, hy + 0.6, 5.4, 3.4, hair); // hard-hat dome
    c.rect(2, hy + 2, 12, 1, hair[1]); // brim
    c.rect(7, hy + 3, 2, 1, hair[0]);
    if (dir !== "up") { c.rect(7, hy - 1, 2, 2, "z"); c.set(7, hy - 1, "v", c.nextPart()); } // crystal lamp
    if (dir === "left") c.rect(1, hy + 1, 3, 2, "z");
    if (dir === "right") c.rect(12, hy + 1, 3, 2, "z");
    c.rect(4, hy + 7, 8, 2, "s"); // neckerchief
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
  const ranger = who === "lensmith-oriel";
  const c = new Canvas(48, 48);
  const hair = ["a", "b", "c", "d"];
  const skin = ["e", "f", "g", "h"];
  const body = ["l", "m", "n", "o"];
  c.ellipse(24, 52, 22, 13, body);
  if (ranger) {
    c.line(24, 36, 24, 48, "l");
    c.rect(22, 36, 4, 12, "x"); // white shirt
    c.rect(23, 37, 2, 11, "s"); // violet tie
    c.rect(33, 32, 13, 16, "y"); // ledger
    c.rect(33, 32, 2, 16, "t");
    c.rect(38, 36, 6, 1, "v");
    c.rect(38, 40, 5, 1, "v");
  } else {
    c.ellipse(24, 40, 17, 5, ["x", "x", "x", "x"]); // cream blouse collar
    c.rect(22, 38, 4, 10, "s"); // price-tag ribbon
    c.rect(22, 38, 1, 10, "v");
    c.rect(30, 42, 4, 6, "t");
  }
  c.rect(20, 33, 8, 6, skin[1]);
  if (!ranger) {
    c.ellipse(24, 14, 17, 11, hair); // hard-hat dome
    c.rect(5, 16, 38, 4, hair[1]); // brim
  }
  c.ellipse(24, 23, 13, 14.5, skin);
  c.ellipse(11, 25, 2.4, 3.4, skin);
  c.ellipse(37, 25, 2.4, 3.4, skin);
  if (ranger) {
    c.ellipse(15, 29, 3, 6, hair); // grey sideburns
    c.ellipse(33, 29, 3, 6, hair);
    c.ellipse(13, 20, 4, 8, hair); // white side hair
    c.ellipse(35, 20, 4, 8, hair);
    c.ellipse(24, 6, 8, 5, hair); // silver bun
  } else {
    c.rect(20, 6, 8, 7, "z"); // crystal lamp
    c.rect(21, 7, 3, 3, "v");
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
  if (ranger) for (const ex of [18, 30]) { c.line(ex - 5, ey - 4, ex + 5, ey - 4, "z"); c.line(ex - 5, ey + 4, ex + 5, ey + 4, "z"); c.line(ex - 5, ey - 4, ex - 5, ey + 4, "z"); c.line(ex + 5, ey - 4, ex + 5, ey + 4, "z"); }
  if (ranger) c.line(23, ey, 25, ey, "z");
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
  ["delver-kern", "DELVER KERN", kernPal, "DELVER_KERN", "Delver Kern, a Conv Caverns trainer, overworld, 16×24: yellow hard hat with a teal crystal lamp, slate vest, red neckerchief."],
  ["lensmith-oriel", "LENSMITH ORIEL", orielPal, "LENSMITH_ORIEL", "Lensmith Oriel, a Conv Caverns trainer, overworld, 16×24: silver bun, round brass spectacles, teal cloak, lens case."],
];
for (const [id, name, pal, ex, doc] of defs) {
  writeFileSync(out + `${id}.ts`, toModule({ id, name, doc, exportName: ex, w: 16, h: 24, palette: pal, fps: ow, anims: charAnims(id), generator: "scripts/art/nest-trainers.mjs" }));
  writeFileSync(
    out + `${id}-portrait.ts`,
    toModule({ id: `${id}-portrait`, name, doc: doc.replace("overworld, 16×24", "dialogue portrait, 48×48"), exportName: `${ex}_PORTRAIT`, w: 48, h: 48, palette: pal, fps: { idle: 3, talk: 6, smile: 2, think: 2 }, anims: portraitAnims(id), generator: "scripts/art/nest-trainers.mjs" }),
  );
}
console.log("wrote caverns trainers");
