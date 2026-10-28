// Tiny shaded-primitive rasteriser used to author creature sprites.
// A Canvas is a grid of palette characters plus a part-id buffer, so the
// outline pass can draw contour lines both around the silhouette and
// between overlapping body parts.

export class Canvas {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.px = Array.from({ length: h }, () => Array(w).fill("."));
    this.id = Array.from({ length: h }, () => Array(w).fill(-1));
    this.order = 0;
  }
  inside(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  set(x, y, ch, part) {
    x = Math.round(x);
    y = Math.round(y);
    if (!this.inside(x, y)) return;
    this.px[y][x] = ch;
    this.id[y][x] = part;
  }
  nextPart() {
    return this.order++;
  }
  /** Shaded ellipse. ramp[0] is darkest. Light comes from the top-left. */
  ellipse(cx, cy, rx, ry, ramp, { angle = 0, light = [-0.5, -0.6, 0.62], bias = 0, part = this.nextPart(), clip } = {}) {
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    const R = Math.ceil(Math.max(rx, ry)) + 1;
    for (let y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++) {
      for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        const u = (dx * ca + dy * sa) / rx;
        const v = (-dx * sa + dy * ca) / ry;
        const r2 = u * u + v * v;
        if (r2 > 1) continue;
        if (clip && !clip(x, y)) continue;
        const z = Math.sqrt(1 - r2);
        // rotate the normal back into screen space
        const nx = u * ca - v * sa;
        const ny = u * sa + v * ca;
        const d = nx * light[0] + ny * light[1] + z * light[2] + bias;
        const n = ramp.length;
        let lvl;
        if (n === 4) lvl = d > 0.62 ? 3 : d > 0.3 ? 2 : d > -0.12 ? 1 : 0;
        else if (n === 3) lvl = d > 0.45 ? 2 : d > -0.05 ? 1 : 0;
        else lvl = Math.min(n - 1, Math.max(0, Math.floor(((d + 1) / 2) * n)));
        this.set(x, y, ramp[lvl], part);
      }
    }
    return part;
  }
  /** Flat filled ellipse (eyes, highlights). */
  disc(cx, cy, rx, ry, ch, part = this.nextPart()) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const u = (x + 0.5 - cx) / rx;
        const v = (y + 0.5 - cy) / ry;
        if (u * u + v * v <= 1) this.set(x, y, ch, part);
      }
    return part;
  }
  rect(x0, y0, w, h, ch, part = this.nextPart()) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, ch, part);
    return part;
  }
  line(x0, y0, x1, y1, ch, part = this.nextPart()) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, ch, part);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
    return part;
  }
  /** Only paint where the pixel already belongs to `part` (decals on a body). */
  decal(fn, part) {
    const keep = (x, y) => this.id[y]?.[x] === part;
    fn(keep);
  }
  /**
   * Outline pass. `edge` becomes the silhouette outline (drawn outside the
   * shape). `inner` is drawn where a part meets a part painted before it.
   * `skip` is a set of characters that never produce lines (glows, fx).
   */
  outline(edge, inner, skip = new Set()) {
    const src = this.px.map((r) => [...r]);
    const ids = this.id.map((r) => [...r]);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (src[y][x] !== ".") continue;
        for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const c = src[y + oy]?.[x + ox];
          if (c && c !== "." && !skip.has(c)) {
            this.px[y][x] = edge;
            break;
          }
        }
      }
    }
    if (inner) {
      for (let y = 0; y < this.h; y++) {
        for (let x = 0; x < this.w; x++) {
          const me = ids[y][x];
          if (me < 0 || skip.has(src[y][x])) continue;
          // the later (upper) part keeps its pixels; the lower one gets the line
          for (const [ox, oy] of [[1, 0], [0, 1]]) {
            const o = ids[y + oy]?.[x + ox];
            if (o === undefined || o < 0 || o === me) continue;
            if (skip.has(src[y + oy][x + ox])) continue;
            if (o > me) this.px[y][x] = inner;
            else this.px[y + oy][x + ox] = inner;
          }
        }
      }
    }
  }
  rows() {
    return this.px.map((r) => r.join(""));
  }
}

/** Serialise a SpriteDef as a TypeScript module. */
export function toModule({ id, name, doc, exportName, w, h, palette, fps, anims, generator }) {
  const pal = Object.entries(palette)
    .map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`)
    .join(",\n");
  const an = Object.entries(anims)
    .map(([k, frames]) => `    ${k}: [\n${frames.map((f) => `      [\n${f.map((r) => `        "${r}"`).join(",\n")},\n      ]`).join(",\n")},\n    ]`)
    .join(",\n");
  return `// Generated by ${generator}, then committed. Edit freely.
import type { SpriteDef } from "../pixel";

/** ${doc} */
export const ${exportName}: SpriteDef = {
  id: ${JSON.stringify(id)},
  name: ${JSON.stringify(name)},
  w: ${w},
  h: ${h},
  palette: {
${pal},
  },
  fps: ${JSON.stringify(fps)},
  anims: {
${an},
  },
};
`;
}
