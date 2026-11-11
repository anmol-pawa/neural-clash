/** Battle stage drawing (canvas 2D, nearest-neighbour). Pure function of a `StageFx` snapshot; browser only. */
import { frameToRGBA, type SpriteDef } from "@/game/sprites/pixel";

export const STAGE_W = 240;
export const STAGE_H = 128;

export interface StageFx {
  t: number; // seconds since mount
  /** Seconds since the last player attack / foe counter / foe faint (negative = never). */
  attackAt: number;
  hurtAt: number;
  foeHitAt: number;
  foeHp: number; // 0..1
  playerHp: number; // 0..1
  foeDown: boolean;
  playerDown: boolean;
  shake: number;
  floaters: { text: string; x: number; y: number; age: number; color: string }[];
}

const cache = new Map<string, HTMLCanvasElement>();
type Tint = "none" | "white" | "noise";

function sprite(def: SpriteDef, anim: string, i: number, tint: Tint): HTMLCanvasElement {
  const frames = def.anims[anim] ?? def.anims.idle;
  const idx = ((i % frames.length) + frames.length) % frames.length;
  const key = `${def.id}:${anim}:${idx}:${tint}`;
  let c = cache.get(key);
  if (!c) {
    c = document.createElement("canvas");
    c.width = def.w;
    c.height = def.h;
    const recolor =
      tint === "white" ? (): [number, number, number] => [255, 255, 255]
      : tint === "noise" ? ([r, g, b]: [number, number, number]): [number, number, number] => {
          const l = (r + g + b) / 3;
          return [Math.min(255, l * 0.9 + 70), l * 0.45, Math.min(255, l * 1.05 + 40)];
        }
      : undefined;
    c.getContext("2d")!.putImageData(new ImageData(frameToRGBA(def, frames[idx], recolor) as Uint8ClampedArray<ArrayBuffer>, def.w, def.h), 0, 0);
    cache.set(key, c);
  }
  return c;
}

const frameFor = (def: SpriteDef, anim: string, t: number) => Math.floor(t * (def.fps?.[anim] ?? 6));

export type StageTheme = "grid" | "vale" | "gorge" | "peaks" | "grove" | "market";

/** Vector Vale: a twilight meadow of crystals over a lattice floor, with slowly turning basis axes on the horizon. */
function valeBackdrop(g: CanvasRenderingContext2D, t: number) {
  const sky = g.createLinearGradient(0, 0, 0, 78);
  sky.addColorStop(0, "#1b1040");
  sky.addColorStop(0.55, "#4a2a7a");
  sky.addColorStop(1, "#b0507e");
  g.fillStyle = sky;
  g.fillRect(0, 0, STAGE_W, STAGE_H);
  // twinkling stars
  for (let i = 0; i < 26; i++) {
    g.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(t * 1.5 + i * 1.7));
    g.fillStyle = i % 4 === 0 ? "#ffd9a0" : "#e8e0ff";
    g.fillRect((i * 47) % STAGE_W, 4 + ((i * 23) % 40), 1, 1);
  }
  g.globalAlpha = 1;
  // a big pale moon with a basis cross that slowly turns
  g.fillStyle = "#f3e6ff";
  g.beginPath();
  g.arc(50, 30, 15, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#d8c4f2";
  g.beginPath();
  g.arc(45, 26, 5, 0, Math.PI * 2);
  g.fill();
  const a = t * 0.35;
  g.lineWidth = 2;
  g.strokeStyle = "#f2b84b";
  g.beginPath();
  g.moveTo(50, 30);
  g.lineTo(50 + Math.cos(a) * 22, 30 + Math.sin(a) * 22);
  g.stroke();
  g.strokeStyle = "#ff7aa8";
  g.beginPath();
  g.moveTo(50, 30);
  g.lineTo(50 + Math.cos(a + 1.2) * 22, 30 + Math.sin(a + 1.2) * 22);
  g.stroke();
  g.lineWidth = 1;
  // distant crystal ridge
  for (let i = 0; i < 12; i++) {
    const bx = i * 22 - 6;
    const h = 12 + ((i * 11) % 7) * 4;
    g.fillStyle = "#2b1a56";
    g.beginPath();
    g.moveTo(bx, 78);
    g.lineTo(bx + 5, 78 - h);
    g.lineTo(bx + 11, 78 - h * 0.7);
    g.lineTo(bx + 18, 78);
    g.fill();
    g.fillStyle = "#6a4cc0";
    g.fillRect(bx + 5, 78 - h, 1, h - 4);
  }
  // meadow floor with lattice lines
  const floor = g.createLinearGradient(0, 78, 0, STAGE_H);
  floor.addColorStop(0, "#26406a");
  floor.addColorStop(1, "#0f1d3c");
  g.fillStyle = floor;
  g.fillRect(0, 78, STAGE_W, STAGE_H - 78);
  g.strokeStyle = "rgba(242,184,75,0.35)";
  for (let i = -6; i <= 14; i++) {
    g.beginPath();
    g.moveTo(STAGE_W / 2 + (i - 4) * 10, 78);
    g.lineTo(STAGE_W / 2 + (i - 4) * 34, STAGE_H);
    g.stroke();
  }
  g.strokeStyle = "rgba(255,122,168,0.35)";
  for (let k = 0; k < 5; k++) {
    const y = 78 + (k * k * 2.2 + 4 + ((t * 5) % 4));
    if (y < STAGE_H) g.fillRect(0, Math.floor(y), STAGE_W, 1);
  }
  // glow-bells swaying on the horizon
  for (let i = 0; i < 9; i++) {
    const x = 8 + i * 27;
    const sway = Math.round(Math.sin(t * 2 + i) * 1);
    g.fillStyle = "#3d7a5a";
    g.fillRect(x, 74, 1, 5);
    g.fillStyle = i % 2 ? "#7be0ff" : "#ffd36e";
    g.fillRect(x - 1 + sway, 72, 3, 3);
  }
}

/** Gradient Gorge: a dusk canyon with layered contour-etched cliffs, a meltwater stream and a ball rolling down a slope. */
function gorgeBackdrop(g: CanvasRenderingContext2D, t: number) {
  const sky = g.createLinearGradient(0, 0, 0, 70);
  sky.addColorStop(0, "#3a1e3a");
  sky.addColorStop(0.5, "#b0503a");
  sky.addColorStop(1, "#f4a85a");
  g.fillStyle = sky;
  g.fillRect(0, 0, STAGE_W, STAGE_H);
  // low sun with a halo
  g.fillStyle = "rgba(255,226,150,0.25)";
  g.beginPath();
  g.arc(172, 58, 24, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#ffe29a";
  g.beginPath();
  g.arc(172, 58, 12, 0, Math.PI * 2);
  g.fill();
  // three cliff layers, far to near; each has stepped, contour-like edges
  const layers: [string, string, number, number][] = [
    ["#6a3450", "#8a4a60", 44, 3],
    ["#7a3a30", "#a05a3c", 54, 5],
    ["#5a2a24", "#8a4a30", 64, 7],
  ];
  layers.forEach(([dark, light, base, amp], li) => {
    g.fillStyle = dark;
    g.fillRect(0, base, STAGE_W, 80 - base);
    for (let x = 0; x < STAGE_W; x += 4) {
      const h = Math.floor(amp * (0.5 + 0.5 * Math.sin(x * 0.045 + li * 2.1) * Math.cos(x * 0.021 + li)));
      g.fillRect(x, base - h, 4, h);
      g.fillStyle = light;
      g.fillRect(x, base - h, 4, 1);
      g.fillStyle = dark;
    }
  });
  // descent arrows etched into the far wall
  g.fillStyle = "rgba(124,240,160,0.55)";
  for (let i = 0; i < 4; i++) {
    const x = 20 + i * 54;
    g.fillRect(x, 46, 1, 6);
    g.fillRect(x - 2, 50, 5, 1);
    g.fillRect(x - 1, 51, 3, 1);
  }
  // canyon floor with contour rings
  const floor = g.createLinearGradient(0, 78, 0, STAGE_H);
  floor.addColorStop(0, "#9a5a34");
  floor.addColorStop(1, "#4a2418");
  g.fillStyle = floor;
  g.fillRect(0, 78, STAGE_W, STAGE_H - 78);
  g.strokeStyle = "rgba(255,200,120,0.28)";
  for (let k = 1; k <= 4; k++) {
    g.beginPath();
    g.ellipse(STAGE_W / 2, 118, k * 34, k * 8, 0, 0, Math.PI * 2);
    g.stroke();
  }
  // meltwater stream shimmering along the back of the floor
  g.fillStyle = "#1f7a86";
  g.fillRect(0, 76, STAGE_W, 5);
  for (let x = 0; x < STAGE_W; x += 8) {
    g.fillStyle = (Math.floor(t * 4) + x / 8) % 3 === 0 ? "#c8f6f0" : "#4cc0c0";
    g.fillRect(x + ((x / 8) % 2) * 3, 77 + (x / 8) % 2, 3, 1);
  }
  // a glowing ball rolling down a bowl-shaped slope on the horizon, looping
  const p = (t * 0.35) % 1;
  const bx = 118 + (p - 0.5) * 70;
  const by = 52 + Math.pow((p - 0.5) * 2, 2) * -8 + 10;
  g.fillStyle = "#ff7a3a";
  g.fillRect(Math.round(bx) - 2, Math.round(by) - 2, 4, 4);
  g.fillStyle = "#ffd9a0";
  g.fillRect(Math.round(bx) - 1, Math.round(by) - 2, 2, 1);
}

/** Probability Peaks: a cold dawn over snow ridges, a bell-curve mountain with sigma bands, drifting dice-pip snow. */
function peaksBackdrop(g: CanvasRenderingContext2D, t: number) {
  const sky = g.createLinearGradient(0, 0, 0, 72);
  sky.addColorStop(0, "#1c2a5a");
  sky.addColorStop(0.6, "#6a7ac0");
  sky.addColorStop(1, "#f0b8c8");
  g.fillStyle = sky;
  g.fillRect(0, 0, STAGE_W, STAGE_H);
  // faint stars
  g.fillStyle = "rgba(255,255,255,0.7)";
  for (const [x, y] of [[20, 8], [58, 16], [96, 6], [150, 12], [204, 9], [226, 20]]) g.fillRect(x, y + ((Math.floor(t * 2) + x) % 3 === 0 ? 1 : 0), 1, 1);
  // far jagged ridge
  g.fillStyle = "#8a9ad0";
  for (let x = 0; x < STAGE_W; x += 4) {
    const h = 10 + 8 * Math.abs(Math.sin(x * 0.05)) + 4 * Math.abs(Math.sin(x * 0.17));
    g.fillRect(x, 66 - h, 4, h);
  }
  // the bell-curve mountain: height follows exp(-z^2/2), banded at 1, 2 and 3 sigma
  const cx = 120;
  for (let x = 0; x < STAGE_W; x += 2) {
    const z = (x - cx) / 38;
    const h = Math.round(38 * Math.exp(-0.5 * z * z));
    const band = Math.abs(z) < 1 ? 0 : Math.abs(z) < 2 ? 1 : 2;
    g.fillStyle = ["#e8f0ff", "#b8c8ec", "#8a9cd0"][band];
    g.fillRect(x, 74 - h, 2, h);
    g.fillStyle = "#ffffff";
    g.fillRect(x, 74 - h, 2, 1);
  }
  // sigma band ticks and the mean line
  g.fillStyle = "rgba(60,80,140,0.55)";
  for (const k of [-2, -1, 1, 2]) g.fillRect(cx + k * 38, 62, 1, 12);
  g.fillStyle = "#ff5ad0";
  g.fillRect(cx, 34, 1, 40);
  g.fillRect(cx - 2, 33, 5, 1);
  // snowfield floor with a pale lattice of drifts
  const floor = g.createLinearGradient(0, 74, 0, STAGE_H);
  floor.addColorStop(0, "#dfe8fa");
  floor.addColorStop(1, "#8a9ac4");
  g.fillStyle = floor;
  g.fillRect(0, 74, STAGE_W, STAGE_H - 74);
  g.strokeStyle = "rgba(90,110,170,0.35)";
  for (let k = 1; k <= 4; k++) {
    g.beginPath();
    g.ellipse(STAGE_W / 2, 120, k * 34, k * 8, 0, 0, Math.PI * 2);
    g.stroke();
  }
  // glacial stream along the back of the floor
  g.fillStyle = "#3a8ac0";
  g.fillRect(0, 74, STAGE_W, 4);
  for (let x = 0; x < STAGE_W; x += 8) {
    g.fillStyle = (Math.floor(t * 4) + x / 8) % 3 === 0 ? "#e0f6ff" : "#7ac0e8";
    g.fillRect(x + ((x / 8) % 2) * 3, 75, 3, 1);
  }
  // drifting "snow" that are tiny dice pips
  g.fillStyle = "#ffffff";
  for (let i = 0; i < 18; i++) {
    const x = (i * 53 + t * (8 + (i % 4) * 3)) % STAGE_W;
    const y = (i * 37 + t * (10 + (i % 3) * 4)) % STAGE_H;
    g.fillRect(Math.floor(x), Math.floor(y), 1, 1);
    if (i % 5 === 0) g.fillRect(Math.floor(x) + 2, Math.floor(y) + 2, 1, 1);
  }
}

/** Classic Grove: a dappled-green glade; a decision-tree canopy forks overhead, scatter-plot clusters dot the moss, a dashed boundary line cuts the floor. */
function groveBackdrop(g: CanvasRenderingContext2D, t: number) {
  const sky = g.createLinearGradient(0, 0, 0, 72);
  sky.addColorStop(0, "#9ad8b8");
  sky.addColorStop(1, "#e6f4c0");
  g.fillStyle = sky;
  g.fillRect(0, 0, STAGE_W, STAGE_H);
  // distant tree line
  g.fillStyle = "#6aa86a";
  for (let x = 0; x < STAGE_W; x += 6) {
    const h = 14 + 8 * Math.abs(Math.sin(x * 0.07)) + 5 * Math.abs(Math.sin(x * 0.21));
    g.fillRect(x, 68 - h, 6, h);
  }
  // a big decision tree: trunk, root split, two children, four leaves
  const cx = 120;
  g.strokeStyle = "#5a3a1c";
  g.lineWidth = 3;
  const seg = (x1: number, y1: number, x2: number, y2: number) => {
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke();
  };
  seg(cx, 74, cx, 44);
  seg(cx, 44, cx - 34, 28);
  seg(cx, 44, cx + 34, 28);
  g.lineWidth = 2;
  for (const dx of [-34, 34]) {
    seg(cx + dx, 28, cx + dx - 16, 14);
    seg(cx + dx, 28, cx + dx + 16, 14);
  }
  // nodes (the root blinks) and class-coloured leaf clusters
  const blink = Math.floor(t * 2) % 4 === 0;
  g.fillStyle = blink ? "#fff3a0" : "#ffe14a";
  g.fillRect(cx - 3, 41, 7, 7);
  g.fillRect(cx - 37, 25, 6, 6);
  g.fillRect(cx + 31, 25, 6, 6);
  const leaf = ["#22b8c8", "#e8409a", "#e8409a", "#22b8c8"];
  [-50, -18, 18, 50].forEach((dx, i) => {
    g.fillStyle = "#3e8a46";
    g.beginPath();
    g.ellipse(cx + dx, 12, 11, 8, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = leaf[i];
    for (const [ox, oy] of [[-4, -2], [3, 0], [-1, 3], [5, -4]]) g.fillRect(cx + dx + ox, 12 + oy, 2, 2);
  });
  // mossy floor
  const floor = g.createLinearGradient(0, 74, 0, STAGE_H);
  floor.addColorStop(0, "#9ad06a");
  floor.addColorStop(1, "#4a8a44");
  g.fillStyle = floor;
  g.fillRect(0, 74, STAGE_W, STAGE_H - 74);
  // scatter-plot clusters on the moss (cyan vs magenta), and a dashed decision boundary
  const pts: [number, number, number][] = [[24, 90, 0], [34, 96, 0], [18, 102, 0], [44, 108, 0], [30, 116, 0], [200, 92, 1], [214, 100, 1], [226, 90, 1], [206, 112, 1], [220, 118, 1], [190, 104, 1]];
  for (const [x, y, c] of pts) {
    g.fillStyle = c ? "#e8409a" : "#22b8c8";
    g.fillRect(x, y, 3, 3);
    g.fillStyle = "rgba(255,255,255,0.6)";
    g.fillRect(x, y, 1, 1);
  }
  g.fillStyle = "rgba(255,255,255,0.7)";
  for (let y = 76; y < STAGE_H; y += 6) g.fillRect(cx - 1 + Math.round((y - 76) * 0.04), y, 2, 3);
  // drifting leaves
  for (let i = 0; i < 12; i++) {
    const x = (i * 61 + t * (6 + (i % 4) * 2)) % STAGE_W;
    const y = (i * 41 + t * (9 + (i % 3) * 3)) % STAGE_H;
    g.fillStyle = i % 2 ? "#c8e870" : "#f0c050";
    g.fillRect(Math.floor(x), Math.floor(y), 2, 1);
  }
}

/** Metric Market: a sandstone bazaar at dusk; striped awnings, a canal, a giant ROC signboard whose operating point slides, a threshold dial and a confusion-matrix mosaic floor. */
function marketBackdrop(g: CanvasRenderingContext2D, t: number) {
  const sky = g.createLinearGradient(0, 0, 0, 72);
  sky.addColorStop(0, "#f2b27a");
  sky.addColorStop(1, "#fbe3b4");
  g.fillStyle = sky;
  g.fillRect(0, 0, STAGE_W, STAGE_H);
  // skyline of stalls with violet / cream striped awnings
  for (let i = 0; i < 6; i++) {
    const x = i * 42 - 6;
    g.fillStyle = "#c9a074";
    g.fillRect(x, 44 + (i % 2) * 4, 38, 30);
    for (let s = 0; s < 6; s++) {
      g.fillStyle = s % 2 ? "#f6eed4" : "#7a4cc0";
      g.fillRect(x + s * 6.5, 40 + (i % 2) * 4, 6.5, 9);
    }
    g.fillStyle = "#6a4a80";
    g.fillRect(x + 6, 56 + (i % 2) * 4, 8, 14);
  }
  // ROC signboard: axes, a bowed curve and a sliding operating point
  const bx = 92, by = 6;
  g.fillStyle = "#5a3a2c";
  g.fillRect(bx + 22, by + 44, 4, 24);
  g.fillStyle = "#fff6dc";
  g.fillRect(bx, by, 48, 44);
  g.strokeStyle = "#2a2240";
  g.lineWidth = 1;
  g.strokeRect(bx + 0.5, by + 0.5, 47, 43);
  g.beginPath();
  g.moveTo(bx + 6, by + 38);
  g.lineTo(bx + 6, by + 6);
  g.moveTo(bx + 6, by + 38);
  g.lineTo(bx + 42, by + 38);
  g.stroke();
  g.strokeStyle = "#cfc6a8";
  g.beginPath();
  g.moveTo(bx + 6, by + 38);
  g.lineTo(bx + 42, by + 6);
  g.stroke();
  g.strokeStyle = "#7a4cc0";
  g.lineWidth = 2;
  g.beginPath();
  const roc = (u: number) => Math.pow(u, 0.35);
  for (let k = 0; k <= 20; k++) {
    const u = k / 20;
    const px = bx + 6 + u * 36, py = by + 38 - roc(u) * 32;
    if (k === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.stroke();
  const u = 0.5 + 0.4 * Math.sin(t * 0.8);
  g.fillStyle = "#e8409a";
  g.fillRect(Math.round(bx + 6 + u * 36) - 2, Math.round(by + 38 - roc(u) * 32) - 2, 5, 5);
  // sandstone plaza with a confusion-matrix mosaic
  const floor = g.createLinearGradient(0, 74, 0, STAGE_H);
  floor.addColorStop(0, "#e6cc98");
  floor.addColorStop(1, "#b8955a");
  g.fillStyle = floor;
  g.fillRect(0, 74, STAGE_W, STAGE_H - 74);
  const mx = 104, my = 112;
  for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
    g.fillStyle = r === c ? "#22b8c8" : "#d6b070";
    if (r === 1 && c === 1) g.fillStyle = "#e8409a";
    g.fillRect(mx + c * 16, my + r * 8, 15, 7);
    g.fillStyle = "rgba(255,255,255,0.35)";
    g.fillRect(mx + c * 16, my + r * 8, 15, 1);
  }
  // canal strip with shimmer
  g.fillStyle = "#4aa8c0";
  g.fillRect(0, 76, STAGE_W, 5);
  g.fillStyle = "rgba(255,255,255,0.6)";
  for (let i = 0; i < 14; i++) g.fillRect(Math.floor((i * 19 + t * 14) % STAGE_W), 77 + (i % 3), 4, 1);
  // threshold dial: a half-circle gauge with a swinging needle
  g.fillStyle = "#f6eed4";
  g.beginPath();
  g.arc(36, 126, 16, Math.PI, 0);
  g.fill();
  g.strokeStyle = "#2a2240";
  g.lineWidth = 1;
  g.stroke();
  const a = Math.PI + (0.5 + 0.35 * Math.sin(t * 1.3)) * Math.PI;
  g.strokeStyle = "#e8409a";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(36, 126);
  g.lineTo(36 + Math.cos(a) * 13, 126 + Math.sin(a) * 13);
  g.stroke();
  // drifting price-tag confetti
  for (let i = 0; i < 12; i++) {
    const x = (i * 61 + t * (5 + (i % 4) * 2)) % STAGE_W;
    const y = (i * 41 + t * (8 + (i % 3) * 3)) % STAGE_H;
    g.fillStyle = i % 2 ? "#f6eed4" : "#b488f0";
    g.fillRect(Math.floor(x), Math.floor(y), 2, 1);
  }
}

function backdrop(g: CanvasRenderingContext2D, t: number, theme: StageTheme = "grid") {
  if (theme === "vale") return valeBackdrop(g, t);
  if (theme === "gorge") return gorgeBackdrop(g, t);
  if (theme === "peaks") return peaksBackdrop(g, t);
  if (theme === "grove") return groveBackdrop(g, t);
  if (theme === "market") return marketBackdrop(g, t);
  const sky = g.createLinearGradient(0, 0, 0, 78);
  sky.addColorStop(0, "#0d1033");
  sky.addColorStop(1, "#2a2a6e");
  g.fillStyle = sky;
  g.fillRect(0, 0, STAGE_W, STAGE_H);
  // a drifting field of tiny "activation" dots
  for (let i = 0; i < 28; i++) {
    const x = (i * 53 + t * (4 + (i % 5))) % STAGE_W;
    const y = 6 + ((i * 29) % 62);
    g.fillStyle = i % 3 === 0 ? "#5eead4" : "#8b8fe8";
    g.globalAlpha = 0.35 + 0.35 * Math.sin(t * 2 + i);
    g.fillRect(Math.floor(x), y, 1, 1);
  }
  g.globalAlpha = 1;
  // distant layered-network skyline
  for (let i = 0; i < 9; i++) {
    const bx = i * 28 - 4;
    const bh = 14 + ((i * 7) % 5) * 5;
    g.fillStyle = "#1a1c52";
    g.fillRect(bx, 78 - bh, 20, bh);
    g.fillStyle = "#2c2f7a";
    for (let r = 0; r < bh - 4; r += 6) g.fillRect(bx + 3, 78 - bh + 3 + r, 3, 2);
  }
  // floor: perspective grid
  const floor = g.createLinearGradient(0, 78, 0, STAGE_H);
  floor.addColorStop(0, "#14304a");
  floor.addColorStop(1, "#0b1a2c");
  g.fillStyle = floor;
  g.fillRect(0, 78, STAGE_W, STAGE_H - 78);
  g.strokeStyle = "rgba(94,234,212,0.28)";
  g.lineWidth = 1;
  for (let i = -6; i <= 14; i++) {
    g.beginPath();
    g.moveTo(STAGE_W / 2 + (i - 4) * 10, 78);
    g.lineTo(STAGE_W / 2 + (i - 4) * 34, STAGE_H);
    g.stroke();
  }
  for (let k = 0; k < 5; k++) {
    const y = 78 + (k * k * 2.2 + 4 + ((t * 6) % 4));
    if (y < STAGE_H) g.fillRect(0, Math.floor(y), STAGE_W, 1);
  }
}

function platform(g: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number) {
  g.fillStyle = "#0a1220";
  g.beginPath();
  g.ellipse(cx, cy + 3, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#26466b";
  g.beginPath();
  g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "#5eead4";
  g.stroke();
}

function bar(g: CanvasRenderingContext2D, x: number, y: number, w: number, frac: number, label: string) {
  g.fillStyle = "rgba(8,10,28,0.85)";
  g.fillRect(x, y, w, 15);
  g.strokeStyle = "#8b8fe8";
  g.strokeRect(x + 0.5, y + 0.5, w - 1, 14);
  g.fillStyle = "#e7e9f6";
  g.font = "7px monospace";
  g.fillText(label, x + 3, y + 7);
  g.fillStyle = "#0b1a2c";
  g.fillRect(x + 3, y + 9, w - 6, 3);
  g.fillStyle = frac > 0.5 ? "#4ade80" : frac > 0.25 ? "#facc15" : "#f87171";
  g.fillRect(x + 3, y + 9, Math.round((w - 6) * Math.max(0, Math.min(1, frac))), 3);
}

/** Layout overrides for foes bigger than the 64px Noise minion (96px guardians). */
export interface StageOpts {
  theme?: StageTheme;
  foeLabel?: string;
  foeAt?: { x: number; y: number };
  foePlatform?: { cx: number; cy: number };
  foeBarAt?: { x: number; y: number };
}

export function drawBattle(g: CanvasRenderingContext2D, foe: SpriteDef, hero: SpriteDef, fx: StageFx, opts: StageOpts = {}) {
  const foeAt = opts.foeAt ?? { x: 144, y: 40 };
  const fp = opts.foePlatform ?? { cx: 176, cy: 92 };
  g.imageSmoothingEnabled = false;
  g.save();
  if (fx.shake > 0) g.translate(Math.round((Math.random() - 0.5) * 4 * fx.shake), Math.round((Math.random() - 0.5) * 3 * fx.shake));
  backdrop(g, fx.t, opts.theme);
  platform(g, fp.cx, fp.cy, 40, 7);
  platform(g, 62, 122, 46, 8);

  // foe (Noise minion): idle bob, hurt flash + recoil, faint sink
  const foeHurt = fx.foeHitAt >= 0 && fx.foeHitAt < 0.35;
  const foeAnim = fx.foeDown ? "faint" : foeHurt ? "hurt" : "idle";
  const faintT = fx.foeDown ? Math.min(1, Math.max(0, fx.foeHitAt) / 0.9) : 0;
  const fi = fx.foeDown ? Math.min(3, Math.floor(faintT * 4)) : frameFor(foe, foeAnim, fx.t);
  const bob = fx.foeDown ? 0 : Math.round(Math.sin(fx.t * 3) * 1.5);
  const recoil = foeHurt ? Math.round(6 * (1 - fx.foeHitAt / 0.35)) : 0;
  g.globalAlpha = 1 - faintT * 0.9;
  g.drawImage(sprite(foe, foeAnim, fi, foeHurt && Math.floor(fx.foeHitAt * 24) % 2 === 0 ? "white" : "none"), foeAt.x + recoil, foeAt.y + bob + Math.round(faintT * 14));
  g.globalAlpha = 1;

  // hero (back sprite): lunge on attack, flash when countered
  const atk = fx.attackAt >= 0 && fx.attackAt < 0.4;
  const hurt = fx.hurtAt >= 0 && fx.hurtAt < 0.35;
  const heroAnim = fx.playerDown ? "faint" : hurt ? "hurt" : atk ? "attack" : "idle";
  const hf = fx.playerDown ? 2 : frameFor(hero, heroAnim, heroAnim === "attack" ? fx.attackAt : heroAnim === "hurt" ? fx.hurtAt : fx.t);
  const lunge = atk ? Math.round(Math.sin((fx.attackAt / 0.4) * Math.PI) * 26) : 0;
  const hbob = Math.round(Math.sin(fx.t * 3 + 1) * 1.5);
  g.drawImage(sprite(hero, heroAnim, hf, hurt && Math.floor(fx.hurtAt * 24) % 2 === 0 ? "white" : "none"), 30 + lunge, 66 + hbob);
  if (atk && fx.attackAt > 0.12) {
    // signal bolt travelling to the foe
    const p = Math.min(1, (fx.attackAt - 0.12) / 0.2);
    g.fillStyle = "#fde047";
    g.fillRect(Math.round(80 + p * 84), Math.round(90 - p * 30), 5, 3);
    g.fillStyle = "#fff";
    g.fillRect(Math.round(81 + p * 84), Math.round(91 - p * 30), 2, 1);
  }

  bar(g, opts.foeBarAt?.x ?? 148, opts.foeBarAt?.y ?? 5, 90, fx.foeHp, opts.foeLabel ?? "NOISE MINION");
  bar(g, 6, 5, 90, fx.playerHp, "NEURON-PUP");

  g.font = "bold 10px monospace";
  for (const f of fx.floaters) {
    g.globalAlpha = Math.max(0, 1 - f.age / 1.0);
    g.fillStyle = "#000";
    g.fillText(f.text, f.x + 1, f.y - f.age * 22 + 1);
    g.fillStyle = f.color;
    g.fillText(f.text, f.x, f.y - f.age * 22);
  }
  g.globalAlpha = 1;
  g.restore();
}
