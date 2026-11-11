// Generates game/sprites/characters/{scout-kern,digger-stride}{,-portrait}.ts
// Two Conv Caverns trainers (original designs). Overworld 16x24 with idle, stand and 4-frame walk cycles; portraits 48x48 with idle/talk/smile/think.
//  - Scout Kern: young cave scout, brown hair under a yellow hard hat with a teal crystal lamp, slate-violet jacket, a 3x3 window badge.
//  - Digger Stride: broad-shouldered digger, black hair in a high bun, rust-red scarf, deep-violet coat, a pickaxe over the shoulder.
import { writeFileSync } from "node:fs";
import { Canvas, toModule } from "./raster.mjs";

const base = { k: "#150f26", w: "#ffffff", i: "#1a1236", q: "#e8e2d0", r: "#9aa0b8" };
const kernPal = {
  ...base,
  a: "#3a2214", b: "#5e3a22", c: "#8a5a36", d: "#b88458", // brown hair ramp
  e: "#8a5a40", f: "#b8805c", g: "#dca47c", h: "#f6cfaa", // skin
  l: "#26264a", m: "#3e4078", n: "#6068b0", o: "#98a0e0", // slate-violet jacket
  x: "#f4ecd2", y: "#7a5a30", z: "#ffd23a", // cream shirt, satchel, hard hat yellow
  p: "#2a2e48", s: "#6cf0d0", t: "#a88410", u: "#b84a4a", v: "#fff6a0", // trousers, crystal lamp, hat shade, mouth, lamp glow
};
const stridePal = {
  ...base,
  a: "#0c0c18", b: "#1e1e34", c: "#3a3a58", d: "#6a6a90", // black hair ramp
  e: "#5e3a28", f: "#8a5a3a", g: "#b8825a", h: "#dca87c", // skin
  l: "#2a1448", m: "#46247a", n: "#6c3ca8", o: "#9a6cd8", // deep-violet coat
  p: "#1c1c2c", s: "#d8603a", t: "#8a8aa0", u: "#a8483a", v: "#d0d0e0", // trousers, rust scarf, pick steel, mouth, highlight
  x: "#14141c", y: "#6a4a28", // boots, pick handle
};
const SKIP = new Set();
const STEPS = [
  { l: 0, r: 0, bob: 0, arm: 0 },
  { l: -2, r: 1, bob: -1, arm: 1 },
  { l: 0, r: 0, bob: 0, arm: 0 },
  { l: 1, r: -2, bob: -1, arm: -1 },
];

function figure(who, dir, step) {
  const ranger = who === "digger-stride";
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
      c.rect(4, ty, 8, 2, "x"); // cream collar
      c.rect(6, ty + 3, 4, 4, "l"); // window badge: 3x3 grid, centre lit
      c.rect(6, ty + 3, 4, 4, "o");
      c.rect(7, ty + 4, 2, 2, "s");
    }
  }
  const armY = ty + 1;
  if (side) {
    const f = dir === "left" ? -1 : 1;
    c.rect(7 + st.arm * f, armY, 2, 5, body[1]);
    c.rect(7 + st.arm * f, armY + 4, 2, 2, skin[2]);
    if (ranger) { const px = 7 + st.arm * f + (dir === "left" ? -1 : 2); c.rect(px, armY - 6, 1, 13, "y"); c.rect(px - 2, armY - 7, 5, 2, "t"); } // pickaxe
  } else {
    c.rect(2, armY + (st.arm > 0 ? 1 : 0), 2, 5, body[1]);
    c.rect(2, armY + 4 + (st.arm > 0 ? 1 : 0), 2, 2, skin[2]);
    c.rect(12, armY + (st.arm < 0 ? 1 : 0), 2, 5, body[1]);
    c.rect(12, armY + 4 + (st.arm < 0 ? 1 : 0), 2, 2, skin[2]);
    if (ranger && dir === "down") { c.rect(13, armY - 6, 1, 14, "y"); c.rect(11, armY - 7, 5, 2, "t"); c.rect(11, armY - 7, 2, 1, "v"); } // pickaxe
  }
  if (dir === "up" && !ranger) { c.rect(4, ty, 8, 1, "x"); c.rect(5, ty + 2, 6, 4, "y"); } // collar and satchel from behind
  const hy = 5 + st.bob;
  c.ellipse(8, hy + 3, 4.6, 4.4, skin);
  if (ranger) {
    if (dir === "up") c.ellipse(8, hy + 2.6, 5, 4.2, hair);
    else c.ellipse(8, hy + 2, 5, 2.4, hair);
    // high bun and a rust scarf; face stays clear in front
    c.ellipse(8, hy - 1, 2.4, 2, hair);
    c.rect(3, hy + 2, 2, 3, "b");
    c.rect(11, hy + 2, 2, 3, "b");
    if (dir === "up") c.ellipse(8, hy + 3.4, 4.4, 3.2, hair);
    c.rect(4, hy + 7, 8, 2, "s");
    c.rect(5, hy + 7, 3, 1, "u");
  } else {
    if (dir === "up") c.ellipse(8, hy + 2.6, 5, 4.6, hair);
    else c.ellipse(8, hy + 1.2, 5, 3, hair);
    c.rect(3, hy + 3, 2, 4, "b"); // bob sides
    c.rect(11, hy + 3, 2, 4, "b");
    // yellow hard hat with a teal crystal lamp
    c.ellipse(8, hy + 0.6, 5.2, 2.6, ["t", "z", "z", "z"]);
    c.rect(2, hy + 1, 12, 1, "t");
    if (dir === "down") c.rect(7, hy - 1, 2, 2, "s");
    if (dir === "left") c.rect(2, hy - 1, 2, 2, "s");
    if (dir === "right") c.rect(12, hy - 1, 2, 2, "s");
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
  const ranger = who === "digger-stride";
  const c = new Canvas(48, 48);
  const hair = ["a", "b", "c", "d"];
  const skin = ["e", "f", "g", "h"];
  const body = ["l", "m", "n", "o"];
  c.ellipse(24, 52, 22, 13, body);
  if (ranger) {
    c.ellipse(24, 40, 17, 5, ["s", "s", "s", "s"]); // rust scarf
    c.rect(18, 42, 6, 6, "s");
    c.rect(36, 6, 3, 42, "y"); // pickaxe handle
    c.rect(28, 4, 19, 4, "t"); // pick head
    c.rect(28, 4, 8, 1, "v");
  } else {
    c.ellipse(24, 40, 17, 5, ["x", "x", "x", "x"]); // cream collar
    c.rect(21, 40, 6, 6, "o"); // window badge: 3x3 grid, centre lit
    c.rect(23, 42, 2, 2, "s");
    c.rect(30, 42, 4, 6, "y");
  }
  c.rect(20, 33, 8, 6, skin[1]);
  c.ellipse(24, 21, ranger ? 17 : 17, ranger ? 16 : 16, hair);
  if (ranger) c.ellipse(24, 5, 6, 5, hair); // high bun
  c.ellipse(24, 23, 13, 14.5, skin);
  c.ellipse(11, 25, 2.4, 3.4, skin);
  c.ellipse(37, 25, 2.4, 3.4, skin);
  if (ranger) {
    c.ellipse(24, 13, 14, 5, hair); // fringe swept back
    c.ellipse(11, 24, 3, 8, hair); // side locks
    c.ellipse(37, 24, 3, 8, hair);
  } else {
    c.ellipse(24, 12, 14, 5, hair); // fringe under the hat
    c.ellipse(24, 8, 17, 7, ["t", "z", "z", "z"]); // hard hat
    c.rect(6, 12, 36, 2, "t");
    c.ellipse(24, 6, 3.5, 3, ["s", "s", "s", "s"]); // crystal lamp
    c.set(24, 5, "v", c.nextPart());
    
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
  c.line(14, 19 + bl[0], 21, 19 - bl[1], "a");
  c.line(27, 19 - bl[1], 34, 19 + bl[0], "a");
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
  ["scout-kern", "SCOUT KERN", kernPal, "SCOUT_KERN", "Scout Kern, a Conv Caverns trainer, overworld, 16×24: yellow hard hat with a teal crystal lamp, slate-violet jacket, a 3×3 window badge."],
  ["digger-stride", "DIGGER STRIDE", stridePal, "DIGGER_STRIDE", "Digger Stride, a Conv Caverns trainer, overworld, 16×24: black hair in a high bun, rust scarf, deep-violet coat, pickaxe."],
];
for (const [id, name, pal, ex, doc] of defs) {
  writeFileSync(out + `${id}.ts`, toModule({ id, name, doc, exportName: ex, w: 16, h: 24, palette: pal, fps: ow, anims: charAnims(id), generator: "scripts/art/caverns-trainers.mjs" }));
  writeFileSync(
    out + `${id}-portrait.ts`,
    toModule({ id: `${id}-portrait`, name, doc: doc.replace("overworld, 16×24", "dialogue portrait, 48×48"), exportName: `${ex}_PORTRAIT`, w: 48, h: 48, palette: pal, fps: { idle: 3, talk: 6, smile: 2, think: 2 }, anims: portraitAnims(id), generator: "scripts/art/caverns-trainers.mjs" }),
  );
}
console.log("wrote caverns trainers");
