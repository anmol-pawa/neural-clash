/**
 * Tiles and tile maps as data (renderer-agnostic, no DOM or Pixi).
 *
 * A tile is 16×16 palette characters, with 1+ frames for animated tiles
 * (water, lamps, screens, server LEDs). A map is two character grids, `ground`
 * and `objects`, plus a legend from character to tile name. `.` means no tile.
 */
import { TRANSPARENT, type Frame } from "../sprites/pixel";

export type TileLayer = "ground" | "object" | "building";

export interface TileDef {
  /** Blocks the player (water, walls, furniture). */
  solid: boolean;
  /** Which layer the tile is meant for: ground tiles are opaque, the others may be transparent. */
  layer: TileLayer;
  /** Animation speed in frames per second (0 for static tiles). */
  fps: number;
  frames: readonly Frame[];
}

export interface TileSet {
  id: string;
  size: number;
  palette: Readonly<Record<string, string>>;
  tiles: Readonly<Record<string, TileDef>>;
}

export interface Warp {
  /** Tile the player steps on. */
  at: readonly [number, number];
  to: { map: string; at: readonly [number, number] };
}

export interface Npc {
  id: string;
  at: readonly [number, number];
  facing: "up" | "down" | "left" | "right";
}

export interface TileMap {
  id: string;
  name: string;
  /** Legend: one character → tile name. */
  legend: Readonly<Record<string, string>>;
  ground: readonly string[];
  objects: readonly string[];
  spawn: readonly [number, number];
  warps: readonly Warp[];
  npcs: readonly Npc[];
}

export const NO_TILE = ".";

export function mapSize(m: TileMap): { w: number; h: number } {
  return { w: m.ground[0]?.length ?? 0, h: m.ground.length };
}

/** Name of the tile at (x, y) on a layer, or undefined. */
export function tileAt(m: TileMap, layer: "ground" | "objects", x: number, y: number): string | undefined {
  const ch = m[layer][y]?.[x];
  return ch === undefined || ch === NO_TILE ? undefined : m.legend[ch];
}

/** True if the player may stand on (x, y): in bounds, no solid ground or object tile, no NPC. */
export function isWalkable(m: TileMap, set: TileSet, x: number, y: number): boolean {
  const { w, h } = mapSize(m);
  if (x < 0 || y < 0 || x >= w || y >= h) return false;
  for (const layer of ["ground", "objects"] as const) {
    const n = tileAt(m, layer, x, y);
    if (n === undefined) {
      if (layer === "ground") return false;
      continue;
    }
    if (set.tiles[n]?.solid) return false;
  }
  return !m.npcs.some((n) => n.at[0] === x && n.at[1] === y);
}

/** Problems with a tileset; empty when valid. */
export function validateTileSet(set: TileSet): string[] {
  const errs: string[] = [];
  for (const [k, v] of Object.entries(set.palette)) {
    if ([...k].length !== 1 || k === TRANSPARENT) errs.push(`palette key "${k}" invalid`);
    if (!/^#[0-9a-f]{6}$/i.test(v)) errs.push(`palette "${k}" = "${v}" is not #rrggbb`);
  }
  for (const [name, t] of Object.entries(set.tiles)) {
    if (t.frames.length === 0) errs.push(`${name}: no frames`);
    if (t.frames.length > 1 && !(t.fps > 0)) errs.push(`${name}: animated but fps is 0`);
    t.frames.forEach((f, fi) => {
      if (f.length !== set.size) errs.push(`${name}[${fi}]: ${f.length} rows`);
      f.forEach((row, y) => {
        if (row.length !== set.size) errs.push(`${name}[${fi}] row ${y}: ${row.length} cols`);
        for (const ch of row) if (ch !== TRANSPARENT && !(ch in set.palette)) errs.push(`${name}[${fi}] row ${y}: "${ch}" not in palette`);
      });
      if (t.layer === "ground" && f.some((r) => r.includes(TRANSPARENT))) errs.push(`${name}[${fi}]: ground tiles must be opaque`);
    });
  }
  return errs;
}

/** Problems with a map against a tileset and the known map ids; empty when valid. */
export function validateMap(m: TileMap, set: TileSet, mapIds: readonly string[]): string[] {
  const errs: string[] = [];
  const { w, h } = mapSize(m);
  for (const layer of ["ground", "objects"] as const) {
    if (m[layer].length !== h) errs.push(`${layer}: ${m[layer].length} rows, want ${h}`);
    m[layer].forEach((row, y) => {
      if (row.length !== w) errs.push(`${layer} row ${y}: ${row.length} cols, want ${w}`);
      for (const ch of row) {
        if (ch === NO_TILE) continue;
        const n = m.legend[ch];
        if (!n) errs.push(`${layer} row ${y}: "${ch}" not in legend`);
        else if (!set.tiles[n]) errs.push(`legend "${ch}" → unknown tile "${n}"`);
      }
    });
  }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) if (tileAt(m, "ground", x, y) === undefined) errs.push(`no ground at ${x},${y}`);
  const inb = (p: readonly [number, number]) => p[0] >= 0 && p[1] >= 0 && p[0] < w && p[1] < h;
  if (!inb(m.spawn) || !isWalkable(m, set, m.spawn[0], m.spawn[1])) errs.push(`spawn ${m.spawn} is not walkable`);
  for (const wp of m.warps) {
    if (!inb(wp.at)) errs.push(`warp ${wp.at} out of bounds`);
    if (!mapIds.includes(wp.to.map)) errs.push(`warp to unknown map "${wp.to.map}"`);
  }
  for (const n of m.npcs) if (!inb(n.at) || !isWalkable({ ...m, npcs: [] }, set, n.at[0], n.at[1])) errs.push(`npc ${n.id} stands on a blocked tile`);
  return errs;
}

/** Tiles reachable from `from` by 4-way walking (warp tiles count as walkable). */
export function reachable(m: TileMap, set: TileSet, from: readonly [number, number]): Set<string> {
  const seen = new Set<string>([`${from[0]},${from[1]}`]);
  const q: [number, number][] = [[from[0], from[1]]];
  const warps = new Set(m.warps.map((w) => `${w.at[0]},${w.at[1]}`));
  const open = (x: number, y: number) => isWalkable({ ...m, npcs: [] }, set, x, y) || warps.has(`${x},${y}`);
  while (q.length) {
    const [x, y] = q.pop()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
      if (!seen.has(k) && open(nx, ny)) {
        seen.add(k);
        q.push([nx, ny]);
      }
    }
  }
  return seen;
}
