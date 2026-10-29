/** Tensor shape rules for shape-check cards. A shape is an array of non-negative integers. */

export type Shape = readonly number[];

export type ShapeResult = { ok: true; shape: number[] } | { ok: false; error: string };

const fail = (error: string): ShapeResult => ({ ok: false, error });
const ok = (shape: number[]): ShapeResult => ({ ok: true, shape });

export const fmtShape = (s: Shape): string => `(${s.join(", ")}${s.length === 1 ? "," : ""})`;

/** numpy broadcasting: align from the right; each pair must be equal or contain a 1. */
export function broadcast(a: Shape, b: Shape): ShapeResult {
  const n = Math.max(a.length, b.length);
  const out: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const x = i < n - a.length ? 1 : a[i - (n - a.length)];
    const y = i < n - b.length ? 1 : b[i - (n - b.length)];
    if (x === y || y === 1) out[i] = x;
    else if (x === 1) out[i] = y;
    else return fail(`cannot broadcast ${fmtShape(a)} with ${fmtShape(b)}: ${x} vs ${y} at axis ${i - n}`);
  }
  return ok(out);
}

/** np.matmul: 1-D operands are promoted then squeezed; leading batch dims broadcast. */
export function matmul(a: Shape, b: Shape): ShapeResult {
  if (a.length === 0 || b.length === 0) return fail("matmul needs at least 1-D operands");
  const aa = a.length === 1 ? [1, a[0]] : [...a];
  const bb = b.length === 1 ? [b[0], 1] : [...b];
  const [m, k1] = aa.slice(-2);
  const [k2, n] = bb.slice(-2);
  if (k1 !== k2) return fail(`inner dimensions differ: ${k1} vs ${k2} for ${fmtShape(a)} @ ${fmtShape(b)}`);
  const batch = broadcast(aa.slice(0, -2), bb.slice(0, -2));
  if (!batch.ok) return batch;
  const out = [...batch.shape];
  if (a.length > 1) out.push(m);
  if (b.length > 1) out.push(n);
  return ok(out);
}

/** Output length along one conv/pool axis: floor((n + 2p - d(k-1) - 1)/s) + 1. */
export function convOut(n: number, k: number, stride = 1, pad = 0, dilation = 1): number {
  const span = dilation * (k - 1) + 1;
  if (n + 2 * pad < span) throw new RangeError("kernel larger than padded input");
  return Math.floor((n + 2 * pad - span) / stride) + 1;
}

/** Conv2d on NCHW input: (N,C,H,W) with weight (O,C,kh,kw) -> (N,O,H',W'). */
export function conv2d(x: Shape, outChannels: number, kernel: readonly [number, number], stride = 1, pad = 0): ShapeResult {
  if (x.length !== 4) return fail(`conv2d expects (N, C, H, W), got ${fmtShape(x)}`);
  try {
    return ok([x[0], outChannels, convOut(x[2], kernel[0], stride, pad), convOut(x[3], kernel[1], stride, pad)]);
  } catch (e) {
    return fail((e as Error).message);
  }
}

/** Reshape with at most one -1 wildcard. */
export function reshape(from: Shape, to: Shape): ShapeResult {
  const total = from.reduce((p, v) => p * v, 1);
  const wild = to.filter((v) => v === -1).length;
  if (wild > 1) return fail("only one -1 allowed");
  const known = to.reduce((p, v) => (v === -1 ? p : p * v), 1);
  if (wild === 1) {
    if (known === 0 || total % known !== 0) return fail(`cannot reshape ${total} elements into ${fmtShape(to)}`);
    return ok(to.map((v) => (v === -1 ? total / known : v)));
  }
  return known === total ? ok([...to]) : fail(`cannot reshape ${total} elements into ${fmtShape(to)}`);
}

/** Multi-head split: (B, T, D) -> (B, H, T, D/H). */
export function splitHeads(x: Shape, heads: number): ShapeResult {
  if (x.length !== 3) return fail(`expected (B, T, D), got ${fmtShape(x)}`);
  if (x[2] % heads !== 0) return fail(`D=${x[2]} is not divisible by ${heads} heads`);
  return ok([x[0], heads, x[1], x[2] / heads]);
}

/** Reduction over axes, optionally keeping dims. */
export function reduce(x: Shape, axis: number, keepdims = false): ShapeResult {
  const ax = axis < 0 ? axis + x.length : axis;
  if (ax < 0 || ax >= x.length) return fail(`axis ${axis} out of range for ${fmtShape(x)}`);
  return ok(keepdims ? x.map((v, i) => (i === ax ? 1 : v)) : x.filter((_, i) => i !== ax));
}
