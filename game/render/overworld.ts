/** Draws a WorldState onto a canvas at the sprites' native resolution (CSS scales it up, pixelated). */
import { spriteById } from "@/game/sprites/roster";
import { TILE } from "@/game/sprites/tilemap";
import { camera, mapSize, npcFacing, playerPos, type WorldState } from "@/lib/world/world";
import { frameAt, frameCanvas } from "./atlas";

export const VIEW_W = 11;
export const VIEW_H = 8;

export function drawWorld(ctx: CanvasRenderingContext2D, w: WorldState, t: number): void {
  const tiles = spriteById(w.map.tileset)!;
  const pos = playerPos(w.player);
  const [cx, cy] = camera(w.map, pos, VIEW_W, VIEW_H);
  const ox = Math.round(-cx * TILE);
  const oy = Math.round(-cy * TILE);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#0b1020";
  ctx.fillRect(0, 0, VIEW_W * TILE, VIEW_H * TILE);

  const { w: mw, h: mh } = mapSize(w.map);
  const x0 = Math.max(0, Math.floor(cx)), x1 = Math.min(mw - 1, Math.ceil(cx + VIEW_W));
  const y0 = Math.max(0, Math.floor(cy)), y1 = Math.min(mh - 1, Math.ceil(cy + VIEW_H));
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const name = w.map.legend[w.map.grid[y][x]];
      ctx.drawImage(frameCanvas(tiles, name, frameAt(tiles, name, t)), ox + x * TILE, oy + y * TILE);
    }

  // Characters, back to front by foot position. A 16×24 sprite stands on its tile with 8px of height above it.
  const actors: { y: number; draw: () => void }[] = [];
  for (const n of w.map.npcs) {
    const def = spriteById(n.sprite)!;
    actors.push({ y: n.y, draw: () => ctx.drawImage(frameCanvas(def, `stand-${npcFacing(w, n)}`, frameAt(def, "stand-down", t)), ox + n.x * TILE, oy + n.y * TILE - (def.h - TILE)) });
  }
  const player = spriteById("player")!;
  const walking = w.player.step !== null;
  const anim = `${walking ? "walk" : "stand"}-${w.player.face}`;
  actors.push({
    y: pos[1],
    draw: () => ctx.drawImage(frameCanvas(player, anim, walking ? w.steps * 2 + Math.floor((w.player.step!.t) * 2) : frameAt(player, anim, t)), Math.round(ox + pos[0] * TILE), Math.round(oy + pos[1] * TILE) - (player.h - TILE)),
  });
  actors.sort((a, b) => a.y - b.y).forEach((a) => a.draw());
}
