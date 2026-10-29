/** Canvas drawing helpers for the overworld: cached frame canvases and the scene painter. */
import { frameToRGBA, type SpriteDef } from "@/game/sprites/pixel";
import { TILE } from "@/game/sprites/tilemap";
import { spriteById } from "@/game/sprites/roster";
import { areaHeight, areaWidth, type AreaDef, type Dir, type Npc } from "@/lib/world/area";
import type { Mover } from "@/lib/world/mover";

export const VIEW_W = 15 * TILE;
export const VIEW_H = 10 * TILE;

const cache = new Map<string, HTMLCanvasElement>();

/** One frame of a sprite as a canvas (cached). Falls back to `idle` for unknown animations. */
export function frameCanvas(def: SpriteDef, anim: string, index: number): HTMLCanvasElement {
  const frames = def.anims[anim] ?? def.anims.idle;
  const i = ((index % frames.length) + frames.length) % frames.length;
  const key = `${def.id}/${def.anims[anim] ? anim : "idle"}/${i}`;
  let c = cache.get(key);
  if (!c) {
    c = document.createElement("canvas");
    c.width = def.w;
    c.height = def.h;
    c.getContext("2d")!.putImageData(new ImageData(frameToRGBA(def, frames[i]) as Uint8ClampedArray<ArrayBuffer>, def.w, def.h), 0, 0);
    cache.set(key, c);
  }
  return c;
}

/** Camera offset in pixels: follows the player, clamped to the map, centred when the map is smaller than the view. */
export function camera(area: AreaDef, px: number, py: number): { x: number; y: number } {
  const mw = areaWidth(area) * TILE;
  const mh = areaHeight(area) * TILE;
  const axis = (p: number, view: number, map: number) => (map <= view ? -Math.floor((view - map) / 2) : Math.max(0, Math.min(map - view, Math.round(p * TILE + TILE / 2 - view / 2))));
  return { x: axis(px, VIEW_W, mw), y: axis(py, VIEW_H, mh) };
}

export interface SceneState {
  area: AreaDef;
  mover: Mover;
  /** Runtime NPC facings (areas are immutable data). */
  npcFacing: Readonly<Record<string, Dir>>;
  /** Seconds, for tile and idle animation. */
  time: number;
  /** 0 = clear, 1 = black. */
  fade: number;
}

function drawCharacter(g: CanvasRenderingContext2D, def: SpriteDef, anim: string, frame: number, tx: number, ty: number, cam: { x: number; y: number }) {
  // 16×24 sprites stand on a 16×16 tile: their feet are at the tile's bottom edge.
  g.drawImage(frameCanvas(def, anim, frame), Math.round(tx * TILE - cam.x), Math.round(ty * TILE - cam.y - (def.h - TILE)));
}

export function drawScene(g: CanvasRenderingContext2D, s: SceneState): void {
  const tiles = spriteById(s.area.tiles)!;
  const player = spriteById("player")!;
  const { x: px, y: py } = s.mover.position();
  const cam = camera(s.area, px, py);
  g.imageSmoothingEnabled = false;
  g.fillStyle = "#0b0d1b";
  g.fillRect(0, 0, VIEW_W, VIEW_H);
  const tf = Math.floor(s.time * 3);
  const x0 = Math.max(0, Math.floor(cam.x / TILE));
  const y0 = Math.max(0, Math.floor(cam.y / TILE));
  const x1 = Math.min(areaWidth(s.area) - 1, Math.floor((cam.x + VIEW_W - 1) / TILE));
  const y1 = Math.min(areaHeight(s.area) - 1, Math.floor((cam.y + VIEW_H - 1) / TILE));
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) g.drawImage(frameCanvas(tiles, s.area.legend[s.area.grid[y][x]], tf), x * TILE - cam.x, y * TILE - cam.y);

  // characters, back to front
  type Actor = { y: number; draw: () => void };
  const actors: Actor[] = s.area.npcs.map((n: Npc) => ({
    y: n.y,
    draw: () => {
      const def = spriteById(n.sprite)!;
      drawCharacter(g, def, `stand-${s.npcFacing[n.id] ?? n.facing}`, Math.floor(s.time * 2), n.x, n.y, cam);
    },
  }));
  actors.push({
    y: py,
    draw: () => {
      const m = s.mover;
      if (m.moving) drawCharacter(g, player, `walk-${m.facing}`, Math.floor(m.distance * 2 + (m.step?.t ?? 0) * 2), px, py, cam);
      else drawCharacter(g, player, `stand-${m.facing}`, Math.floor(s.time * 2), px, py, cam);
    },
  });
  actors.sort((a, b) => a.y - b.y).forEach((a) => a.draw());

  if (s.fade > 0) {
    g.fillStyle = `rgba(7,8,18,${Math.min(1, s.fade)})`;
    g.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}
