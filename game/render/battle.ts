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

export type StageTheme = "grid" | "vale" | "gorge";

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

function backdrop(g: CanvasRenderingContext2D, t: number, theme: StageTheme = "grid") {
  if (theme === "vale") return valeBackdrop(g, t);
  if (theme === "gorge") return gorgeBackdrop(g, t);
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
