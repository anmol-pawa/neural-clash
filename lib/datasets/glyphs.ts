import { rng } from "../cards/rng";

/**
 * Glyphs: a seeded mini image dataset (16x16 grayscale, values in [0,1]) with a documented generating process.
 *
 * Six classes of small creature-sigil shapes, each drawn from a distance function in the glyph's own frame:
 *   0 ring, 1 plus, 2 slash, 3 box, 4 twin dots, 5 chevron.
 * Per-image jitter (this is what makes it a *vision* problem, not a lookup table):
 *   - translation: centre moved by up to +-`shift` pixels in x and y (default 2),
 *   - rotation: uniform in +-`rotate` radians (default 0.26, about 15 degrees), applied in the glyph frame,
 *   - scale: size multiplied by a factor in [0.85, 1.15],
 *   - brightness: stroke intensity in [0.7, 1.0],
 *   - noise: additive Gaussian pixel noise with std `noise` (default 0.08), then clipped to [0,1].
 * Classes are drawn uniformly. The shapes are original; none is taken from an existing dataset.
 */
export const GLYPH_SIZE = 16;
export const GLYPH_CLASSES = ["ring", "plus", "slash", "box", "twin-dots", "chevron"] as const;
export type GlyphOptions = { shift?: number; rotate?: number; noise?: number };
export type GlyphSet = { x: Float32Array; y: Int32Array; n: number; size: number };

const STROKE = 0.9; // half-width of a stroke, in pixels

/** Distance (in glyph-frame pixels) from point (u,v) to the class's shape. Shapes have radius ~5. */
export function glyphDistance(cls: number, u: number, v: number): number {
  switch (cls) {
    case 0:
      return Math.abs(Math.hypot(u, v) - 4.5);
    case 1:
      return Math.min(Math.abs(u) + Math.max(0, Math.abs(v) - 5), Math.abs(v) + Math.max(0, Math.abs(u) - 5));
    case 2: {
      const d = Math.abs(u + v) / Math.SQRT2;
      return d + Math.max(0, (Math.abs(u - v) / Math.SQRT2) - 6);
    }
    case 3:
      return Math.abs(Math.max(Math.abs(u), Math.abs(v)) - 4.5);
    case 4:
      return Math.min(Math.hypot(u + 3.2, v) - 1.4, Math.hypot(u - 3.2, v) - 1.4) + 0.9;
    default: {
      // chevron: a V made of two arms from (0,3) to (+-4.5,-3)
      const ax = Math.abs(u);
      const px = ax, py = v;
      const bx = 4.5, by = -3, ox = 0, oy = 3;
      const dx = bx - ox, dy = by - oy;
      const s = Math.min(1, Math.max(0, ((px - ox) * dx + (py - oy) * dy) / (dx * dx + dy * dy)));
      return Math.hypot(px - (ox + s * dx), py - (oy + s * dy));
    }
  }
}

function normal(r: () => number): number {
  return Math.sqrt(-2 * Math.log(Math.max(r(), 1e-12))) * Math.cos(2 * Math.PI * r());
}

/** Render one clean (noise-free, centred, unrotated, unit scale, brightness 1) template. */
export function glyphTemplate(cls: number): Float32Array {
  return render(cls, 0, 0, 0, 1, 1);
}

function render(cls: number, cx: number, cy: number, ang: number, scale: number, bright: number): Float32Array {
  const img = new Float32Array(GLYPH_SIZE * GLYPH_SIZE);
  const c = Math.cos(ang), s = Math.sin(ang);
  const mid = (GLYPH_SIZE - 1) / 2;
  for (let py = 0; py < GLYPH_SIZE; py++) {
    for (let px = 0; px < GLYPH_SIZE; px++) {
      const x = px - mid - cx, y = py - mid - cy;
      const u = (c * x + s * y) / scale, v = (-s * x + c * y) / scale;
      const d = glyphDistance(cls, u, v) * scale;
      img[py * GLYPH_SIZE + px] = bright * Math.min(1, Math.max(0, 1 - d / (STROKE * 1.6) + 0.375));
    }
  }
  return img;
}

export function makeGlyphs(n: number, seed = 11, opts: GlyphOptions = {}): GlyphSet {
  const { shift = 2, rotate = 0.26, noise = 0.08 } = opts;
  const r = rng(seed);
  const x = new Float32Array(n * GLYPH_SIZE * GLYPH_SIZE);
  const y = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    const cls = Math.floor(r() * GLYPH_CLASSES.length);
    const cx = (r() * 2 - 1) * shift, cy = (r() * 2 - 1) * shift;
    const ang = (r() * 2 - 1) * rotate;
    const scale = 0.85 + 0.3 * r();
    const bright = 0.7 + 0.3 * r();
    const img = render(cls, cx, cy, ang, scale, bright);
    for (let k = 0; k < img.length; k++) {
      x[i * img.length + k] = Math.min(1, Math.max(0, img[k] + noise * normal(r)));
    }
    y[i] = cls;
  }
  return { x, y, n, size: GLYPH_SIZE };
}
