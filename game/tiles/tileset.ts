/**
 * Tilesets and tile maps as data (renderer-agnostic, unit-testable in Node).
 * A tile is a square of palette characters like a sprite frame; animated tiles
 * have several frames played at `fps`. A map has a ground layer (every cell
 * painted) and an object layer (transparent cells allowed), both as strings.
 */
import { validateSprite, type Frame, type SpriteDef } from "../sprites/pixel";

export interface TileDef {
  frames: readonly Frame[];
  fps?: number;
}

export interface TileSetDef {
  id: string;
  name: string;
  /** Tile edge in pixels. */
  tile: number;
  palette: Readonly<Record<string, string>>;
  tiles: Readonly<Record<string, TileDef>>;
}

/** Problems with a tileset; empty when valid. Reuses the sprite validator per tile. */
export function validateTileSet(set: TileSetDef): string[] {
  const errs: string[] = [];
  for (const [name, t] of Object.entries(set.tiles)) {
    const asSprite: SpriteDef = { id: name, name, w: set.tile, h: set.tile, palette: set.palette, anims: { idle: t.frames.length >= 2 ? t.frames : [t.frames[0], t.frames[0]] } };
    for (const e of validateSprite(asSprite)) errs.push(`${set.id}/${name}: ${e}`);
    if (t.frames.length > 1 && !t.fps) errs.push(`${set.id}/${name}: animated tile needs fps`);
  }
  return errs;
}

export interface Warp {
  x: number;
  y: number;
  to: string;
  tx: number;
  ty: number;
}

export interface MapDef {
  id: string;
  name: string;
  tileset: TileSetDef;
  /** Map character → tile name, or a [a, b] pair laid out as a checkerboard. */
  legend: Readonly<Record<string, string | readonly [string, string]>>;
  ground: readonly string[];
  /** ' ' is empty. */
  objects: readonly string[];
  /** Tile names that block movement. */
  solid: readonly string[];
  warps: readonly Warp[];
  spawns: Readonly<Record<string, readonly [number, number]>>;
}

export const mapSize = (m: MapDef) => ({ w: m.ground[0].length, h: m.ground.length });

/** Tile names at a cell: [ground, object?]. */
export function tilesAt(m: MapDef, x: number, y: number): [string, string | undefined] {
  const pick = (ch: string | undefined): string | undefined => {
    if (!ch || ch === " ") return undefined;
    const v = m.legend[ch];
    if (v === undefined) return undefined;
    return typeof v === "string" ? v : v[(x + y) % 2];
  };
  return [pick(m.ground[y]?.[x])!, pick(m.objects[y]?.[x])];
}

export function isWalkable(m: MapDef, x: number, y: number): boolean {
  const { w, h } = mapSize(m);
  if (x < 0 || y < 0 || x >= w || y >= h) return false;
  const [g, o] = tilesAt(m, x, y);
  return !m.solid.includes(g) && !(o && m.solid.includes(o));
}

/** Cells reachable from (sx, sy) by 4-way walking, including warp cells entered from a neighbour. */
export function reachable(m: MapDef, sx: number, sy: number): Set<string> {
  const seen = new Set<string>([`${sx},${sy}`]);
  const q: [number, number][] = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
      if (seen.has(k) || !isWalkable(m, nx, ny)) continue;
      seen.add(k);
      q.push([nx, ny]);
    }
  }
  return seen;
}
