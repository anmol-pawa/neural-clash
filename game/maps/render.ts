import { TILE, tileFrameAt, tileRGBA, type TileSetDef } from "../sprites/tileset";
import { mapSize, type MapDef } from "./types";

/** Composite a whole map to RGBA at 1:1 (ground first, then objects by baseline y, then x). */
export function renderMap(m: MapDef, set: TileSetDef, timeMs = 0): { w: number; h: number; data: Uint8ClampedArray } {
  const { w: cw, h: ch } = mapSize(m);
  const W = cw * TILE;
  const H = ch * TILE;
  const data = new Uint8ClampedArray(W * H * 4);
  const blit = (name: string, ox: number, oy: number) => {
    const t = set.tiles[name];
    const px = tileRGBA(set, name, tileFrameAt(t, timeMs));
    for (let y = 0; y < t.h; y++)
      for (let x = 0; x < t.w; x++) {
        const s = (y * t.w + x) * 4;
        if (!px[s + 3]) continue;
        const d = ((oy + y) * W + ox + x) * 4;
        data[d] = px[s];
        data[d + 1] = px[s + 1];
        data[d + 2] = px[s + 2];
        data[d + 3] = 255;
      }
  };
  m.ground.forEach((row, y) => [...row].forEach((c, x) => blit(m.legend[c], x * TILE, y * TILE)));
  const order = [...m.objects].sort((a, b) => a.y + set.tiles[a.tile].h / TILE - (b.y + set.tiles[b.tile].h / TILE) || a.x - b.x);
  for (const o of order) blit(o.tile, o.x * TILE, o.y * TILE);
  return { w: W, h: H, data };
}
