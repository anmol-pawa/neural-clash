import { frameToRGBA, type SpriteDef } from "../sprites/pixel";
import { mapSize, tilesAt, type MapDef, type TileSetDef } from "./tileset";

const cache = new WeakMap<TileSetDef, Map<string, HTMLCanvasElement>>();

/** Offscreen canvas for one frame of one tile, cached. */
function tileCanvas(set: TileSetDef, name: string, frame: number): HTMLCanvasElement {
  let m = cache.get(set);
  if (!m) cache.set(set, (m = new Map()));
  const key = `${name}#${frame}`;
  let c = m.get(key);
  if (!c) {
    const t = set.tiles[name];
    c = document.createElement("canvas");
    c.width = c.height = set.tile;
    const def: SpriteDef = { id: name, name, w: set.tile, h: set.tile, palette: set.palette, anims: { idle: [t.frames[frame % t.frames.length]] } };
    c.getContext("2d")!.putImageData(new ImageData(frameToRGBA(def, def.anims.idle[0]) as Uint8ClampedArray<ArrayBuffer>, set.tile, set.tile), 0, 0);
    m.set(key, c);
  }
  return c;
}

export const tileFrame = (set: TileSetDef, name: string, timeSec: number) => {
  const t = set.tiles[name];
  return t.frames.length > 1 ? Math.floor(timeSec * (t.fps ?? 2)) % t.frames.length : 0;
};

/** Draw a tile at pixel (x, y) of `ctx` (already scaled and not smoothed). */
export function drawTile(ctx: CanvasRenderingContext2D, set: TileSetDef, name: string, x: number, y: number, timeSec: number) {
  ctx.drawImage(tileCanvas(set, name, tileFrame(set, name, timeSec)), x, y);
}

/** Draw a whole map at an integer scale. Sprites (e.g. NPCs) are drawn on top by `after`. */
export function paintMap(canvas: HTMLCanvasElement, map: MapDef, scale: number, timeSec: number, after?: (ctx: CanvasRenderingContext2D) => void) {
  const { w, h } = mapSize(map);
  const T = map.tileset.tile;
  const off = document.createElement("canvas");
  off.width = w * T;
  off.height = h * T;
  const o = off.getContext("2d")!;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const [g, obj] = tilesAt(map, x, y);
      drawTile(o, map.tileset, g, x * T, y * T, timeSec);
      if (obj) drawTile(o, map.tileset, obj, x * T, y * T, timeSec);
    }
  after?.(o);
  canvas.width = off.width * scale;
  canvas.height = off.height * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(off, 0, 0, canvas.width, canvas.height);
}
