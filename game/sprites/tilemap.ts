/**
 * Tile maps as data. A tileset is a SpriteDef whose animations are 16×16
 * tiles; a map is rows of single-character codes resolved through a legend
 * (code → tile name). Pure and renderer-agnostic, like `pixel.ts`; the
 * overworld engine (B2) draws maps with the same tiles.
 */
import { type Frame, type SpriteDef } from "./pixel";

export const TILE = 16;

export type TileLegend = Readonly<Record<string, string>>;

/** Problems with a map (unknown codes or tiles, ragged rows); empty when valid. */
export function validateMap(tiles: SpriteDef, grid: readonly string[], legend: TileLegend): string[] {
  const errs: string[] = [];
  const w = grid[0]?.length ?? 0;
  grid.forEach((row, y) => {
    if (row.length !== w) errs.push(`row ${y}: ${row.length} cols, want ${w}`);
    for (const ch of row) {
      const name = legend[ch];
      if (!name) errs.push(`row ${y}: code "${ch}" not in legend`);
      else if (!tiles.anims[name]) errs.push(`row ${y}: tile "${name}" not in ${tiles.id}`);
    }
  });
  return errs;
}

/** One frame of the whole map; animated tiles show frame `t` (wrapping). */
export function composeMap(tiles: SpriteDef, grid: readonly string[], legend: TileLegend, t = 0): Frame {
  const rows: string[] = [];
  for (const line of grid) {
    for (let py = 0; py < TILE; py++) {
      let r = "";
      for (const ch of line) {
        const frames = tiles.anims[legend[ch]];
        r += frames[t % frames.length][py];
      }
      rows.push(r);
    }
  }
  return rows;
}

/** A looping preview sprite of a map (4 frames, so 2- and 4-frame tiles stay in step). */
export function mapSprite(id: string, name: string, tiles: SpriteDef, grid: readonly string[], legend: TileLegend): SpriteDef {
  return {
    id,
    name,
    w: grid[0].length * TILE,
    h: grid.length * TILE,
    palette: tiles.palette,
    fps: { idle: 2 },
    anims: { idle: [0, 1, 2, 3].map((t) => composeMap(tiles, grid, legend, t)) },
  };
}
