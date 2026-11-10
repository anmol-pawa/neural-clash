// Generates game/sprites/characters/{vendor-odds,auditor-margin}{,-portrait}.ts
// Two Metric Market trainers (original designs). Overworld 16x24 with idle,
// stand and 4-frame walk cycles; portraits 48x48 with idle/talk/smile/think.
//  - Vendor Odds: stall keeper, violet cloak with a cream head wrap, teal scarf, tan hair, coin on a cord.
//  - Auditor Margin: older auditor, green eyeshade, round glasses, dark hair, navy vest, ledger.
import { writeFileSync } from "node:fs";
import { Canvas, toModule } from "./raster.mjs";

const base = { k: "#150f26", w: "#ffffff", i: "#1a1236", q: "#e8e2d0", r: "#9aa0b8" };
const quillPal = {
  ...base,
  a: "#6a3a14", b: "#9a5a1e", c: "#c8822e", d: "#eab05a", // tan-gold hair ramp
  e: "#8a5a40", f: "#b8805c", g: "#dca47c", h: "#f6cfaa", // skin
  l: "#3a1e66", m: "#6a3ab0", n: "#9a6ae0", o: "#c8a8f4", // violet cloak
  x: "#f4ead0", y: "#d4c49a", // cream head wrap and its shadow
  p: "#2a3250", s: "#1ea8a0", t: "#0e6a68", u: "#b84a4a", v: "#7ae8dc", // trousers, teal scarf, mouth, scarf light
};
const brunPal = {
  ...base,
  a: "#1a1a24", b: "#32323e", c: "#4e4e5e", d: "#767688", // dark hair
  e: "#6a3e28", f: "#945a38", g: "#be8454", h: "#e4ac7c", // skin
  l: "#101c3c", m: "#1e3470", n: "#3a5ab0", o: "#7a9ae0", // navy vest
  p: "#3a3a44", s: "#2e9a58", t: "#165a30", u: "#a8483a", v: "#8ae8a8", // trousers, green eyeshade, mouth
  x: "#2a2420", y: "#f4ecd2", // boots, ledger paper
};
const SKIP = new Set();
const STEPS = [
  { l: 0, r: 0, bob: 0, arm: 0 },
  { l: -2, r: 1, bob: -1, arm: 1 },
  { l: 0, r: 0, bob: 0, arm: 0 },
  { l: 1, r: -2, bob: -1, arm: -1 },
];

function figure(who, dir, step) {
  const ranger = who === "auditor-margin";
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
      c.rect(4, ty, 8, 1, "x"); c.rect(4, ty + 4, 8, 1, "x"); // cream sash stripes
      c.rect(7, ty + 1, 2, 6, "m"); // zip
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
    if (ranger && dir === "down") { c.rect(11, armY + 1, 4, 6, "y"); c.rect(12, armY + 2, 2, 1, "r"); c.rect(12, armY + 4, 2, 1, "r"); } // clipboard
  }
  if (dir === "up" && !ranger) { c.rect(4, ty, 8, 2, "x"); c.rect(5, ty + 2, 6, 4, "y"); } // fur hood and pack from behind
  const hy = 5 + st.bob;
  c.ellipse(8, hy + 3, 4.6, 4.4, skin);
  if (ranger) {
    if (dir === "up") c.ellipse(8, hy + 2.6, 5, 4.2, hair);
    else c.ellipse(8, hy + 2, 5, 2.4, hair);
    // green eyeshade visor and round glasses
    c.ellipse(8, hy + 0.4, 5.4, 1.6, ["t", "t", "s", "s"]);
    c.rect(3, hy + 0.5, 10, 2, "s"); // flat visor
    c.rect(3, hy + 2, 10, 1, "t");
    if (dir === "down") { c.rect(4, hy + 3, 3, 3, "r"); c.rect(9, hy + 3, 3, 3, "r"); c.rect(7, hy + 4, 2, 1, "r"); }
  } else {
    if (dir === "up") c.ellipse(8, hy + 2.6, 5, 4.6, hair);
    else c.ellipse(8, hy + 1.2, 5, 3, hair);
    c.rect(2, hy + 1, 12, 2, "x"); // cream head wrap
    c.rect(3, hy + 3, 2, 4, "x");
    c.rect(11, hy + 3, 2, 4, "x");
    c.rect(4, hy + 7, 8, 2, "s"); // teal scarf
    c.rect(5, hy + 7, 3, 1, "v");
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
  const ranger = who === "auditor-margin";
  const c = new Canvas(48, 48);
  const hair = ["a", "b", "c", "d"];
  const skin = ["e", "f", "g", "h"];
  const body = ["l", "m", "n", "o"];
  c.ellipse(24, 52, 22, 13, body);
  if (ranger) {
    c.rect(21, 38, 6, 10, "y"); c.line(24, 38, 24, 48, "l"); // shirt front
    c.rect(33, 32, 13, 16, "y"); // clipboard
    c.rect(35, 35, 9, 1, "r");
    c.rect(35, 38, 9, 1, "r");
    c.rect(35, 41, 6, 1, "r");
  } else {
    c.ellipse(24, 40, 17, 5, ["x", "x", "x", "x"]); // fur collar
    c.rect(14, 38, 20, 5, "s"); // magenta scarf
    c.rect(16, 38, 8, 1, "v");
    c.rect(30, 42, 4, 6, "t");
  }
  c.rect(20, 33, 8, 6, skin[1]);
  if (ranger) {
    c.ellipse(24, 22, 14, 14, hair);
  } else {
    c.ellipse(24, 20, 20, 19, ["y", "x", "x", "x"]); // fur hood
    c.ellipse(24, 8, 18, 6, ["l", "m", "m", "n"]);
  }
  c.ellipse(24, 23, 13, 14.5, skin);
  c.ellipse(11, 25, 2.4, 3.4, skin);
  c.ellipse(37, 25, 2.4, 3.4, skin);
  if (ranger) {
    c.ellipse(24, 14, 13, 4, hair);
    c.ellipse(24, 12, 16, 4, ["t", "s", "s", "s"]); // visor band
    c.rect(7, 9, 34, 5, "s"); // green eyeshade
    c.rect(7, 13, 34, 1, "t");
    c.rect(9, 9, 30, 1, "v");
    for (const ex of [18, 30]) { c.disc(ex, 24.5, 5.4, 4.8, "r"); }
  } else {
    c.ellipse(24, 13, 14, 5, hair); // fringe
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
  ["vendor-odds", "VENDOR ODDS", quillPal, "VENDOR_ODDS", "Botanist Fern, a Classic Grove trainer, overworld, 16×24: moss-green cloak with a leaf-trimmed hood, freckles, amber scarf."],
  ["auditor-margin", "AUDITOR MARGIN", brunPal, "AUDITOR_MARGIN", "Forester Birch, a Classic Grove trainer, overworld, 16×24: brown felt cap with a feather, grey beard, forest-green coat, clipboard."],
];
for (const [id, name, pal, ex, doc] of defs) {
  writeFileSync(out + `${id}.ts`, toModule({ id, name, doc, exportName: ex, w: 16, h: 24, palette: pal, fps: ow, anims: charAnims(id), generator: "scripts/art/market-trainers.mjs" }));
  writeFileSync(
    out + `${id}-portrait.ts`,
    toModule({ id: `${id}-portrait`, name, doc: doc.replace("overworld, 16×24", "dialogue portrait, 48×48"), exportName: `${ex}_PORTRAIT`, w: 48, h: 48, palette: pal, fps: { idle: 3, talk: 6, smile: 2, think: 2 }, anims: portraitAnims(id), generator: "scripts/art/market-trainers.mjs" }),
  );
}
console.log("wrote market trainers");
