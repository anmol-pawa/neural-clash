export type Shape = readonly number[];

export type ShapeResult = { ok: true; shape: number[] } | { ok: false; error: string };

export const shapeToString = (s: Shape): string => `(${s.join(", ")}${s.length === 1 ? "," : ""})`;

/** numpy broadcasting: align right; each pair of dims must be equal or one of them 1. */
export function broadcast(a: Shape, b: Shape): ShapeResult {
  const n = Math.max(a.length, b.length);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const da = i < n - a.length ? 1 : a[i - (n - a.length)];
    const db = i < n - b.length ? 1 : b[i - (n - b.length)];
    if (da === db || da === 1 || db === 1) out.push(da === 1 ? db : da);
    else return { ok: false, error: `operands could not be broadcast together with shapes ${shapeToString(a)} ${shapeToString(b)}` };
  }
  return { ok: true, shape: out };
}

/** numpy matmul / @ semantics, including 1-D operands and batched broadcasting. */
export function matmul(a: Shape, b: Shape): ShapeResult {
  if (a.length === 0 || b.length === 0) return { ok: false, error: "matmul does not accept scalars" };
  const a2 = a.length === 1 ? [1, a[0]] : [...a];
  const b2 = b.length === 1 ? [b[0], 1] : [...b];
  const ka = a2[a2.length - 1];
  const kb = b2[b2.length - 2];
  if (ka !== kb) {
    return { ok: false, error: `matmul: mismatch in the contracted dimension (${ka} vs ${kb}) for shapes ${shapeToString(a)} @ ${shapeToString(b)}` };
  }
  const batch = broadcast(a2.slice(0, -2), b2.slice(0, -2));
  if (!batch.ok) return batch;
  const out = [...batch.shape, a2[a2.length - 2], b2[b2.length - 1]];
  if (a.length === 1) out.splice(out.length - 2, 1);
  if (b.length === 1) out.splice(out.length - 1, 1);
  return { ok: true, shape: out };
}

/** nn.Linear(in, out) applied to x of shape (..., in) gives (..., out). */
export function linear(x: Shape, inFeatures: number, outFeatures: number): ShapeResult {
  if (x.length === 0 || x[x.length - 1] !== inFeatures) {
    return { ok: false, error: `Linear expects last dim ${inFeatures}, got ${shapeToString(x)}` };
  }
  return { ok: true, shape: [...x.slice(0, -1), outFeatures] };
}

/** x.sum(axis, keepdims). Negative axes count from the end. */
export function reduce(x: Shape, axis: number, keepdims: boolean): ShapeResult {
  const ax = axis < 0 ? axis + x.length : axis;
  if (ax < 0 || ax >= x.length) return { ok: false, error: `axis ${axis} is out of bounds for array of dimension ${x.length}` };
  return { ok: true, shape: keepdims ? x.map((d, i) => (i === ax ? 1 : d)) : x.filter((_, i) => i !== ax) };
}

/** reshape with at most one -1 wildcard. */
export function reshape(x: Shape, target: Shape): ShapeResult {
  const total = x.reduce((a, b) => a * b, 1);
  const wild = target.filter((d) => d === -1).length;
  if (wild > 1) return { ok: false, error: "can only specify one unknown dimension" };
  const known = target.filter((d) => d !== -1).reduce((a, b) => a * b, 1);
  if (wild === 1) {
    if (known === 0 || total % known !== 0) return { ok: false, error: `cannot reshape array of size ${total} into shape ${shapeToString(target)}` };
    return { ok: true, shape: target.map((d) => (d === -1 ? total / known : d)) };
  }
  if (known !== total) return { ok: false, error: `cannot reshape array of size ${total} into shape ${shapeToString(target)}` };
  return { ok: true, shape: [...target] };
}

/** Conv2d output size per spatial dim: floor((n + 2p - d(k-1) - 1) / s) + 1. */
export function convOut(n: number, k: number, stride = 1, pad = 0, dilation = 1): number {
  return Math.floor((n + 2 * pad - dilation * (k - 1) - 1) / stride) + 1;
}
