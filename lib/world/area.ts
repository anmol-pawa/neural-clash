/**
 * Overworld areas as data and the pure rules over them: what is solid, where
 * the warps are, what the player is facing. No DOM, no clock.
 */
import type { TileLegend } from "@/game/sprites/tilemap";

export type Dir = "up" | "down" | "left" | "right";
export const DIRS: readonly Dir[] = ["up", "down", "left", "right"];
export const DELTA: Readonly<Record<Dir, readonly [number, number]>> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export const OPPOSITE: Readonly<Record<Dir, Dir>> = { up: "down", down: "up", left: "right", right: "left" };

export interface Npc {
  id: string;
  name: string;
  /** Overworld sprite id; it needs `stand-<dir>` frames. */
  sprite: string;
  x: number;
  y: number;
  facing: Dir;
  /** Dialogue script id played on interact. */
  script: string;
}
export interface Warp {
  x: number;
  y: number;
  to: string;
  tx: number;
  ty: number;
  facing: Dir;
}
/** Something you can examine from the tile in front of you (sign, statue, machine). */
export interface Interact {
  x: number;
  y: number;
  script: string;
}
/** Plays a script when stepped on, once (guarded by the flag `once`). */
export interface Trigger {
  x: number;
  y: number;
  script: string;
  once: string;
}

export interface AreaDef {
  id: string;
  name: string;
  /** Tileset sprite id. */
  tiles: string;
  grid: readonly string[];
  legend: TileLegend;
  /** Tile names the player cannot walk onto. */
  solid: readonly string[];
  spawn: { x: number; y: number; facing: Dir };
  npcs: readonly Npc[];
  warps: readonly Warp[];
  interacts: readonly Interact[];
  triggers: readonly Trigger[];
}

export const areaWidth = (a: AreaDef) => a.grid[0]?.length ?? 0;
export const areaHeight = (a: AreaDef) => a.grid.length;
export const inBounds = (a: AreaDef, x: number, y: number) => x >= 0 && y >= 0 && x < areaWidth(a) && y < areaHeight(a);

export function tileNameAt(a: AreaDef, x: number, y: number): string | undefined {
  return inBounds(a, x, y) ? a.legend[a.grid[y][x]] : undefined;
}

export function npcAt(a: AreaDef, x: number, y: number): Npc | undefined {
  return a.npcs.find((n) => n.x === x && n.y === y);
}

/** Can the player stand on (x, y)? Solid tiles, NPCs and the map edge block. */
export function isWalkable(a: AreaDef, x: number, y: number): boolean {
  const name = tileNameAt(a, x, y);
  if (name === undefined || a.solid.includes(name)) return false;
  return !npcAt(a, x, y);
}

export const warpAt = (a: AreaDef, x: number, y: number) => a.warps.find((w) => w.x === x && w.y === y);

export type Target = { kind: "npc"; npc: Npc } | { kind: "object"; script: string };

/** What the player would interact with when standing at (x, y) facing `dir`. */
export function targetInFront(a: AreaDef, x: number, y: number, dir: Dir): Target | undefined {
  const [dx, dy] = DELTA[dir];
  const fx = x + dx;
  const fy = y + dy;
  const npc = npcAt(a, fx, fy);
  if (npc) return { kind: "npc", npc };
  const obj = a.interacts.find((i) => i.x === fx && i.y === fy);
  return obj ? { kind: "object", script: obj.script } : undefined;
}

/** A not-yet-fired trigger under (x, y), if any. */
export function pendingTrigger(a: AreaDef, x: number, y: number, flags: Readonly<Record<string, unknown>>): Trigger | undefined {
  return a.triggers.find((t) => t.x === x && t.y === y && !flags[t.once]);
}

/** Structural problems with an area (bad codes, out-of-bounds or blocked objects); empty when valid. */
export function validateArea(a: AreaDef, tileNames: readonly string[], scripts: readonly string[]): string[] {
  const errs: string[] = [];
  const w = areaWidth(a);
  a.grid.forEach((row, y) => {
    if (row.length !== w) errs.push(`row ${y}: ${row.length} cols, want ${w}`);
    for (const ch of row) {
      const t = a.legend[ch];
      if (!t) errs.push(`row ${y}: code "${ch}" not in legend`);
      else if (!tileNames.includes(t)) errs.push(`row ${y}: tile "${t}" not in tileset`);
    }
  });
  for (const s of a.solid) if (!tileNames.includes(s)) errs.push(`solid tile "${s}" not in tileset`);
  const spot = (what: string, x: number, y: number) => {
    if (!inBounds(a, x, y)) errs.push(`${what} at (${x},${y}) is out of bounds`);
  };
  spot("spawn", a.spawn.x, a.spawn.y);
  if (inBounds(a, a.spawn.x, a.spawn.y) && !isWalkable(a, a.spawn.x, a.spawn.y)) errs.push("spawn is not walkable");
  for (const n of a.npcs) {
    spot(`npc ${n.id}`, n.x, n.y);
    if (!scripts.includes(n.script)) errs.push(`npc ${n.id}: unknown script "${n.script}"`);
  }
  for (const wp of a.warps) {
    spot("warp", wp.x, wp.y);
    if (inBounds(a, wp.x, wp.y) && a.solid.includes(tileNameAt(a, wp.x, wp.y) ?? "")) errs.push(`warp (${wp.x},${wp.y}) is on a solid tile`);
  }
  for (const i of a.interacts) {
    spot("interact", i.x, i.y);
    if (!scripts.includes(i.script)) errs.push(`interact (${i.x},${i.y}): unknown script "${i.script}"`);
  }
  for (const t of a.triggers) {
    spot("trigger", t.x, t.y);
    if (!scripts.includes(t.script)) errs.push(`trigger (${t.x},${t.y}): unknown script "${t.script}"`);
  }
  return errs;
}
