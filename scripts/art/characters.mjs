// Generates game/sprites/characters/{player,okafor}{,-portrait}.ts
// Overworld sprites are 16x24 with idle + 4-frame walk cycles in four
// directions. Portraits are 48x48 with idle (blink) and talk frames.
// Player: teal hoodie, headphones, satchel. Okafor: white lab coat, round
// glasses, curly salt-and-pepper hair, a slate tablet. Original designs.
import { writeFileSync } from "node:fs";
import { Canvas, toModule } from "./raster.mjs";

const mk = (extra) => ({
  k: "#150f26", // outline
  w: "#ffffff",
  i: "#1a1236", // pupil
  ...extra,
});

const playerPal = mk({
  a: "#3a2418", b: "#5a3a26", c: "#7d5236", // hair ramp
  d: "#a8663f", e: "#d58b5c", f: "#f0b283", g: "#ffd2a8", // skin ramp (darkest..lightest)
  h: "#0d5560", l: "#14808c", m: "#22b0b8", n: "#6fe0dc", // hoodie ramp
  o: "#2a2f55", p: "#454c86", // jeans
  q: "#e8e2d0", r: "#9aa0b8", // shoes / headphone band
  s: "#d9a03a", t: "#8a5a1c", // satchel
  u: "#c24a78", // mouth
});
const okafPal = mk({
  a: "#4a4a58", b: "#7a7a8c", c: "#b4b4c4", d: "#e6e6ee", // grey curls ramp
  e: "#6e3d24", f: "#97593a", g: "#bd7a50", h: "#e0a070", // skin ramp
  l: "#a8b0c8", m: "#d4dae8", n: "#eef1f8", o: "#ffffff", // coat ramp
  p: "#3c3f6a", q: "#5a5fa0", // trousers / shirt
  r: "#2c2c40", s: "#7c8cff", // glasses frame / lens
  t: "#2a3a4a", u: "#6df0f7", // tablet / screen glow
  v: "#b3405f", // mouth
});

const SKIP = new Set();

/** Walk-cycle parameters per frame: leg offsets and arm swing. */
const STEPS = [
  { l: 0, r: 0, bob: 0, arm: 0 },
  { l: -2, r: 1, bob: -1, arm: 1 },
  { l: 0, r: 0, bob: 0, arm: 0 },
  { l: 1, r: -2, bob: -1, arm: -1 },
];

function figure(who, dir, step) {
  const P = who === "player" ? playerPal : okafPal;
  const c = new Canvas(16, 24);
  const st = STEPS[step];
  const coat = who === "okafor";
  const hair = coat ? ["a", "b", "c", "d"] : ["a", "b", "c", "c"];
  const skin = coat ? ["e", "f", "g", "h"] : ["d", "e", "f", "g"];
  const body = coat ? ["l", "m", "n", "o"] : ["h", "l", "m", "n"];
  const legc = coat ? ["p", "p", "q", "q"] : ["o", "o", "p", "p"];
  const side = dir === "left" || dir === "right";
  const bob = st.bob;
  // shadow-ish feet and legs
  const legTop = coat ? 18 : 17;
  const drawLeg = (x, off) => {
    c.rect(x, legTop + Math.max(0, -off), 3, 5 - Math.max(0, -off) + Math.min(0, off) + 0, legc[2]);
    c.rect(x, 21 + Math.min(0, off), 3, 2, "q", c.nextPart()); // shoe
  };
  if (side) {
    const front = dir === "left" ? -1 : 1;
    // two legs overlapping, offset along the facing axis
    c.rect(7 + st.l * front, legTop, 3, 4, legc[1]);
    c.rect(6 + st.l * front, 21, 4, 2, "q");
    c.rect(7 + st.r * front, legTop, 3, 4, legc[2]);
    c.rect(6 + st.r * front, 21, 4, 2, "q");
  } else {
    c.rect(5, legTop - Math.min(0, st.l) * 0, 3, 4 + (st.l < 0 ? -1 : 0), legc[1]);
    c.rect(5, 21 + (st.l < 0 ? -1 : 0), 3, 2, "q");
    c.rect(8, legTop, 3, 4 + (st.r < 0 ? -1 : 0), legc[2]);
    c.rect(8, 21 + (st.r < 0 ? -1 : 0), 3, 2, "q");
  }
  // torso
  const ty = 11 + bob;
  const tlen = coat ? 9 : 7;
  if (side) {
    c.ellipse(8, ty + tlen / 2, 4.2, tlen / 2 + 0.6, body);
    if (coat) c.rect(5, ty + tlen - 2, 6, 2, body[1]);
  } else {
    c.ellipse(8, ty + tlen / 2, 5.4, tlen / 2 + 0.6, body);
    if (coat) c.rect(4, ty + tlen - 2, 8, 2, body[1]);
  }
  // pocket/zip/lapel detail
  if (dir === "down") {
    if (coat) {
      c.line(8, ty + 1, 8, ty + tlen - 1, body[1]);
      c.rect(9, ty + 2, 2, 2, "q"); // shirt tie accent
    } else {
      c.line(8, ty + 1, 8, ty + 4, "r"); // drawstrings
    }
  }
  // arms
  const armY = ty + 1;
  if (side) {
    const f = dir === "left" ? -1 : 1;
    c.rect(7 + st.arm * f, armY, 2, 5, body[1]);
    c.rect(7 + st.arm * f, armY + 4, 2, 2, skin[2]);
    if (coat && dir) c.rect(6 + st.arm * f, armY + 3, 4, 3, "t"); // tablet held
  } else {
    c.rect(2, armY + (st.arm > 0 ? 1 : 0), 2, 5, body[1]);
    c.rect(2, armY + 4 + (st.arm > 0 ? 1 : 0), 2, 2, skin[2]);
    c.rect(12, armY + (st.arm < 0 ? 1 : 0), 2, 5, body[1]);
    c.rect(12, armY + 4 + (st.arm < 0 ? 1 : 0), 2, 2, skin[2]);
    if (coat && dir === "down") c.rect(12, armY + 4, 3, 3, "t");
  }
  // satchel / backpack for the player
  if (!coat) {
    if (dir === "up") c.ellipse(8, ty + 3, 4, 3.5, ["t", "t", "s", "s"]);
    else if (side) c.ellipse(dir === "left" ? 10.5 : 5.5, ty + 3.5, 2, 3, ["t", "t", "s", "s"]);
    else c.line(3, ty, 12, ty + 6, "s"); // strap across the chest
  }
  // head
  const hy = 5 + bob;
  c.ellipse(8, hy + 3, 4.6, 4.4, skin);
  if (dir === "up") {
    c.ellipse(8, hy + 2.6, 5, 4.6, hair);
  } else {
    // hair cap
    c.ellipse(8, hy + 1.2, 5, 3, hair);
    if (coat) {
      // curls: bumpy outline
      for (const x of [3, 5, 8, 11, 12]) c.disc(x, hy, 1.6, 1.4, hair[x % 2 ? 2 : 1]);
    } else if (side) {
      c.rect(dir === "left" ? 9 : 3, hy + 1, 4, 3, hair[1]);
    }
  }
  // face
  if (dir === "down") {
    c.rect(5, hy + 3, 2, 2, "w");
    c.rect(9, hy + 3, 2, 2, "w");
    c.set(6, hy + 4, "i", c.nextPart());
    c.set(10, hy + 4, "i", c.nextPart());
    if (coat) {
      c.rect(4, hy + 3, 4, 1, "r");
      c.rect(8, hy + 3, 4, 1, "r");
    }
    c.set(7, hy + 6, coat ? "v" : "u", c.nextPart());
    c.set(8, hy + 6, coat ? "v" : "u", c.nextPart());
  } else if (side) {
    const ex = dir === "left" ? 5 : 10;
    c.rect(ex, hy + 3, 2, 2, "w");
    c.set(dir === "left" ? ex : ex + 1, hy + 4, "i", c.nextPart());
    if (coat) c.rect(ex - (dir === "left" ? 1 : 0), hy + 3, 3, 1, "r");
  }
  if (!coat) {
    // headphones: band + ear cups
    c.line(3, hy + 1, 3, hy + 4, "r");
    c.line(12, hy + 1, 12, hy + 4, "r");
    c.rect(2, hy + 3, 2, 3, "m");
    c.rect(12, hy + 3, 2, 3, "m");
    c.line(4, hy - 1, 11, hy - 1, "r");
  }
  c.outline("k", null, SKIP);
  return c.rows();
}

function charAnims(who) {
  const anims = {};
  const names = { down: "down", up: "up", left: "left", right: "right" };
  for (const dir of Object.keys(names)) anims[`walk-${dir}`] = [0, 1, 2, 3].map((s) => figure(who, dir, s));
  anims.idle = [figure(who, "down", 0), figure(who, "down", 0).map((r, i) => r)];
  // second idle frame: a one-pixel breath (shift head/torso up)
  const f = figure(who, "down", 1);
  anims.idle = [figure(who, "down", 0), f.map((row, y) => row)];
  anims.idle[1] = shiftUp(anims.idle[0]);
  for (const dir of Object.keys(names)) anims[`stand-${dir}`] = [figure(who, dir, 0), shiftUp(figure(who, dir, 0))];
  return anims;
}
// one-pixel breath: move everything above the feet up by one row
function shiftUp(rows) {
  const out = rows.map((r) => r);
  for (let y = 0; y < 20; y++) out[y] = rows[y + 1];
  out[20] = rows[20];
  out[19] = rows[19];
  return out.map((r, y) => (y < 19 ? rows[y + 1] : rows[y]));
}

/** Portrait: bust at 48x48. */
function portrait(who, mood, frame) {
  const P = who === "player" ? playerPal : okafPal;
  const coat = who === "okafor";
  const c = new Canvas(48, 48);
  const hair = coat ? ["a", "b", "c", "d"] : ["a", "b", "c", "c"];
  const skin = coat ? ["e", "f", "g", "h"] : ["d", "e", "f", "g"];
  const body = coat ? ["l", "m", "n", "o"] : ["h", "l", "m", "n"];
  // shoulders / torso
  c.ellipse(24, 52, 22, 13, body);
  if (coat) {
    // lapels and shirt
    c.rect(19, 38, 10, 10, "q");
    c.line(19, 37, 24, 47, "l");
    c.line(29, 37, 24, 47, "l");
    c.rect(22, 38, 4, 2, "p"); // collar knot
  } else {
    c.rect(18, 38, 12, 4, body[1]); // hood rim
    c.line(21, 41, 21, 47, "r");
    c.line(27, 41, 27, 47, "r");
    c.line(6, 40, 42, 52, "s"); // satchel strap
  }
  // neck
  c.rect(20, 33, 8, 6, skin[1]);
  // back hair mass
  if (coat) {
    for (const [x, y, r] of [[10, 18, 5], [14, 10, 6], [22, 7, 6], [30, 8, 6], [37, 12, 6], [39, 20, 5], [13, 24, 3], [36, 26, 3]]) c.ellipse(x, y, r, r, hair);
  } else {
    c.ellipse(24, 20, 17, 17, hair);
  }
  // head
  c.ellipse(24, 23, 13, 14.5, skin);
  // ears
  c.ellipse(11, 25, 2.4, 3.4, skin);
  c.ellipse(37, 25, 2.4, 3.4, skin);
  // fringe
  if (coat) {
    for (const [x, y, r] of [[15, 12, 5], [22, 9, 5], [29, 10, 5], [34, 14, 4]]) c.ellipse(x, y, r, r, hair);
  } else {
    c.ellipse(24, 12, 14, 7, hair);
    c.ellipse(17, 16, 6, 5, hair);
    c.ellipse(32, 15, 6, 4, hair);
  }
  // eyes
  const blink = mood === "blink";
  const ey = 24;
  for (const ex of [18, 30]) {
    if (blink) {
      c.line(ex - 3, ey + 1, ex + 3, ey + 1, "k");
    } else {
      c.ellipse(ex, ey, 3.6, 3.2, ["w", "w", "w", "w"]);
      c.disc(ex + (mood === "think" ? 1 : 0), ey + 0.5, 1.9, 2.1, "i");
      c.set(ex - 0.5, ey - 1, "w", c.nextPart());
    }
  }
  // brows
  const bl = mood === "think" ? [-1, 1] : [0, 0];
  c.line(14, 19 + bl[0], 21, 19 + bl[1] * -1, coat ? "b" : "a");
  c.line(27, 19 + bl[1] * -1, 34, 19 + bl[0], coat ? "b" : "a");
  // glasses (Okafor)
  if (coat) {
    for (const ex of [18, 30]) {
      c.ellipse(ex, ey, 5.8, 5.2, ["r", "s", "s", "s"], { part: c.nextPart(), clip: (x, y) => ((x + 0.5 - ex) / 5.8) ** 2 + ((y + 0.5 - ey) / 5.2) ** 2 > 0.62 });
    }
    c.line(23, 23, 25, 23, "r");
  }
  // nose + mouth
  c.line(24, 27, 23, 30, skin[0]);
  if (mood === "talk" || frame === "talk2") {
    c.ellipse(24, 34, 3.2, 2.2, coat ? ["v", "v", "v", "v"] : ["t", "t", "u", "u"]);
    c.rect(22, 33, 5, 1, "w");
  } else {
    c.line(21, 34, 27, 34, coat ? "v" : "u");
    if (mood === "smile") { c.set(20, 33, coat ? "v" : "u", c.nextPart()); c.set(28, 33, coat ? "v" : "u", c.nextPart()); }
  }
  if (!coat) {
    // headphones
    c.ellipse(24, 14, 17, 17, ["r", "r", "r", "r"], { clip: (x, y) => y < 22 && ((x + 0.5 - 24) ** 2 / 17 ** 2 + (y + 0.5 - 14) ** 2 / 17 ** 2) > 0.8 });
    c.ellipse(9, 26, 3.2, 5, ["h", "l", "m", "n"]);
    c.ellipse(39, 26, 3.2, 5, ["h", "l", "m", "n"]);
  } else {
    // tablet corner in the lower frame
    c.rect(33, 41, 13, 7, "t");
    c.rect(34, 42, 11, 5, "u");
  }
  c.outline("k", null, SKIP);
  return c.rows();
}

const portraitAnims = (who) => ({
  idle: [portrait(who, "neutral", "a"), portrait(who, "neutral", "a"), portrait(who, "blink", "a"), portrait(who, "neutral", "a")],
  talk: [portrait(who, "neutral", "a"), portrait(who, "talk", "talk2")],
  smile: [portrait(who, "smile", "a"), portrait(who, "smile", "a")],
  think: [portrait(who, "think", "a"), portrait(who, "think", "a")],
});

const out = "game/sprites/characters/";
const ow = { idle: 2, "stand-down": 2, "stand-up": 2, "stand-left": 2, "stand-right": 2, "walk-down": 8, "walk-up": 8, "walk-left": 8, "walk-right": 8 };
const defs = [
  ["player", "PLAYER", playerPal, "PLAYER", "The player, overworld, 16×24: teal hoodie, headphones and a satchel."],
  ["okafor", "PROF. OKAFOR", okafPal, "OKAFOR", "Professor Lumen Okafor, overworld, 16×24: lab coat, round glasses, a tablet."],
];
for (const [id, name, pal, ex, doc] of defs) {
  writeFileSync(out + `${id}.ts`, toModule({ id, name, doc, exportName: ex, w: 16, h: 24, palette: pal, fps: ow, anims: charAnims(id), generator: "scripts/art/characters.mjs" }));
  writeFileSync(
    out + `${id}-portrait.ts`,
    toModule({ id: `${id}-portrait`, name, doc: doc.replace("overworld, 16×24", "dialogue portrait, 48×48"), exportName: `${ex}_PORTRAIT`, w: 48, h: 48, palette: pal, fps: { idle: 3, talk: 6, smile: 2, think: 2 }, anims: portraitAnims(id), generator: "scripts/art/characters.mjs" }),
  );
}
console.log("wrote character sprites");
