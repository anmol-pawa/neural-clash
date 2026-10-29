/**
 * Tilesets as data. A tile is one or more animation frames of character-grid
 * rows (same palette convention as `pixel.ts`); objects may span several 16×16
 * cells, so `w`/`h` are multiples of `TILE`. Renderer-agnostic (no DOM, no Pixi).
 */
import { frameToRGBA, TRANSPARENT, hexToRgb, type Frame, type SpriteDef } from "./pixel";

export const TILE = 16;

export interface TileDef {
  w: number;
  h: number;
  frames: readonly Frame[];
  /** Blocks walking over its whole footprint. */
  solid?: boolean;
  /** Frames per second when it has more than one frame (default 2). */
  fps?: number;
}

export interface TileSetDef {
  id: string;
  name: string;
  palette: Readonly<Record<string, string>>;
  tiles: Readonly<Record<string, TileDef>>;
}

/** Problems with a tileset; empty when it is valid. */
export function validateTileSet(set: TileSetDef): string[] {
  const errs: string[] = [];
  for (const [k, v] of Object.entries(set.palette)) {
    if ([...k].length !== 1) errs.push(`palette key "${k}" must be one character`);
    if (k === TRANSPARENT) errs.push(`palette must not define "${TRANSPARENT}"`);
    if (!/^#[0-9a-f]{6}$/i.test(v)) errs.push(`palette "${k}" = "${v}" is not #rrggbb`);
  }
  for (const [name, t] of Object.entries(set.tiles)) {
    if (t.w % TILE || t.h % TILE) errs.push(`${name}: ${t.w}×${t.h} is not a multiple of ${TILE}`);
    if (t.frames.length === 0) errs.push(`${name}: no frames`);
    t.frames.forEach((f, fi) => {
      if (f.length !== t.h) errs.push(`${name}[${fi}]: ${f.length} rows, want ${t.h}`);
      f.forEach((row, y) => {
        if (row.length !== t.w) errs.push(`${name}[${fi}] row ${y}: ${row.length} cols, want ${t.w}`);
        for (const ch of row) if (ch !== TRANSPARENT && !(ch in set.palette)) errs.push(`${name}[${fi}] row ${y}: "${ch}" not in palette`);
      });
    });
  }
  return errs;
}

/** Which frame of a tile is showing at `timeMs`. */
export function tileFrameAt(t: TileDef, timeMs: number): number {
  if (t.frames.length === 1) return 0;
  return Math.floor((timeMs / 1000) * (t.fps ?? 2)) % t.frames.length;
}

/** RGBA pixels for one frame of one tile. */
export function tileRGBA(set: TileSetDef, name: string, frame: number): Uint8ClampedArray {
  const t = set.tiles[name];
  if (!t) throw new Error(`unknown tile "${name}" in ${set.id}`);
  const def = { w: t.w, h: t.h, palette: set.palette } as unknown as SpriteDef;
  return frameToRGBA(def, t.frames[frame % t.frames.length]);
}

export { hexToRgb };
