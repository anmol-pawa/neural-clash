/** Palette + character-grid sprites: each char of a row maps to a palette colour; "." is transparent. */
export type Palette = Readonly<Record<string, string>>;

export interface GridSprite {
  readonly width: number;
  readonly height: number;
  /** Row-major RGBA bytes (length width*height*4). */
  readonly rgba: Uint8ClampedArray;
}

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`bad colour ${hex}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function parseGrid(rows: readonly string[], palette: Palette): GridSprite {
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  const rgba = new Uint8ClampedArray(width * height * 4);
  rows.forEach((row, y) => {
    if (row.length !== width) throw new Error(`row ${y} has width ${row.length}, expected ${width}`);
    for (let x = 0; x < width; x++) {
      const ch = row[x];
      if (ch === ".") continue;
      const colour = palette[ch];
      if (!colour) throw new Error(`no palette entry for "${ch}" at ${x},${y}`);
      const [r, g, b] = hexToRgb(colour);
      rgba.set([r, g, b, 255], (y * width + x) * 4);
    }
  });
  return { width, height, rgba };
}
