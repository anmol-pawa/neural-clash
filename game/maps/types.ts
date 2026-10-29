/**
 * Tile maps as data. `ground` rows use one legend character per 16×16 cell;
 * `objects` are placed by cell (top-left anchored) and drawn in y-order.
 * Pure data and helpers (no DOM, no Pixi) so layouts can be unit tested.
 */
import { TILE, type TileSetDef } from "../sprites/tileset";

export interface MapObject {
  tile: string;
  x: number;
  y: number;
}

export interface MapDef {
  id: string;
  name: string;
  /** Legend: character → ground tile name. */
  legend: Readonly<Record<string, string>>;
  ground: readonly string[];
  objects: readonly MapObject[];
  /** Named cells (cell coordinates) for the player, NPCs and exits. */
  spawns: Readonly<Record<string, { x: number; y: number }>>;
}

export const mapSize = (m: MapDef) => ({ w: m.ground[0].length, h: m.ground.length });

/** Problems with a map; empty when it is valid. */
export function validateMap(m: MapDef, set: TileSetDef): string[] {
  const errs: string[] = [];
  const { w, h } = mapSize(m);
  m.ground.forEach((row, y) => {
    if (row.length !== w) errs.push(`ground row ${y} has ${row.length} cells, want ${w}`);
    for (const ch of row) {
      const t = m.legend[ch];
      if (!t) errs.push(`ground row ${y}: "${ch}" not in legend`);
      else if (!set.tiles[t]) errs.push(`legend "${ch}" → unknown tile "${t}"`);
    }
  });
  for (const o of m.objects) {
    const t = set.tiles[o.tile];
    if (!t) {
      errs.push(`object "${o.tile}" is not in the tileset`);
      continue;
    }
    if (o.x < 0 || o.y < 0 || o.x + t.w / TILE > w || o.y + t.h / TILE > h) errs.push(`object "${o.tile}" at ${o.x},${o.y} leaves the map`);
  }
  for (const [name, s] of Object.entries(m.spawns)) if (s.x < 0 || s.y < 0 || s.x >= w || s.y >= h) errs.push(`spawn "${name}" is outside the map`);
  return errs;
}

/** Blocked cells (true = solid) from solid ground tiles and solid object footprints. */
export function collisionGrid(m: MapDef, set: TileSetDef): boolean[][] {
  const { w, h } = mapSize(m);
  const grid = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => !!set.tiles[m.legend[m.ground[y][x]]]?.solid));
  for (const o of m.objects) {
    const t = set.tiles[o.tile];
    if (!t?.solid) continue;
    for (let dy = 0; dy < t.h / TILE; dy++) for (let dx = 0; dx < t.w / TILE; dx++) if (grid[o.y + dy]?.[o.x + dx] !== undefined) grid[o.y + dy][o.x + dx] = true;
  }
  return grid;
}

/** Can a walker get from `a` to `b` on 4-connected open cells? */
export function reachable(grid: readonly (readonly boolean[])[], a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  if (grid[a.y]?.[a.x] !== false || grid[b.y]?.[b.x] !== false) return false;
  const seen = new Set([`${a.x},${a.y}`]);
  const q = [a];
  while (q.length) {
    const p = q.shift()!;
    if (p.x === b.x && p.y === b.y) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = { x: p.x + dx, y: p.y + dy };
      const key = `${n.x},${n.y}`;
      if (seen.has(key) || grid[n.y]?.[n.x] !== false) continue;
      seen.add(key);
      q.push(n);
    }
  }
  return false;
}
