/**
 * Conv-net bookkeeping solvers: output sizes (padding/stride/dilation/ceil mode/transposed),
 * receptive fields, parameter counts and multiply-accumulate (MAC) counts for a layer stack.
 * Pure arithmetic; every function is checked against a brute-force count in tests/conv.test.ts.
 */

export type Pad = number | "same" | "valid";

export interface ConvSpec {
  kind: "conv" | "pool";
  /** Kernel (h, w). */
  k: readonly [number, number];
  stride?: number;
  pad?: Pad;
  dilation?: number;
  /** Output channels (conv only; pools keep the channel count). */
  out?: number;
  groups?: number;
  bias?: boolean;
  /** Pools may round the output size up (framework option). */
  ceil?: boolean;
}

export interface Dims {
  c: number;
  h: number;
  w: number;
}

/** Effective kernel extent once dilation inserts gaps. */
export const effectiveKernel = (k: number, dilation = 1): number => dilation * (k - 1) + 1;

/** Total padding (both sides) for a named mode; "same" needs stride 1 to keep the size exactly. */
export function totalPad(k: number, pad: Pad, dilation = 1): number {
  if (pad === "valid") return 0;
  if (pad === "same") return effectiveKernel(k, dilation) - 1;
  return 2 * pad;
}

/** Output length along one axis. floor((n + totalPad - dilation(k-1) - 1) / s) + 1, or ceil for pools. */
export function outSize(n: number, k: number, stride = 1, pad: Pad = 0, dilation = 1, ceil = false): number {
  const span = effectiveKernel(k, dilation);
  const padded = n + totalPad(k, pad, dilation);
  if (padded < span) throw new RangeError(`kernel extent ${span} exceeds padded input ${padded}`);
  const steps = (padded - span) / stride;
  return (ceil ? Math.ceil(steps) : Math.floor(steps)) + 1;
}

/** Transposed convolution: (n-1)s - 2p + d(k-1) + outputPadding + 1. */
export function transposedOutSize(n: number, k: number, stride = 1, pad = 0, dilation = 1, outputPadding = 0): number {
  if (outputPadding >= Math.max(stride, dilation)) throw new RangeError("output padding must be smaller than stride or dilation");
  return (n - 1) * stride - 2 * pad + dilation * (k - 1) + outputPadding + 1;
}

/** Learnable parameters of a conv layer: out * (in/groups) * kh * kw (+ out for bias). */
export function convParams(inC: number, outC: number, k: readonly [number, number], groups = 1, bias = true): number {
  if (inC % groups !== 0 || outC % groups !== 0) throw new RangeError("channels must be divisible by groups");
  return outC * (inC / groups) * k[0] * k[1] + (bias ? outC : 0);
}

/** Multiply-accumulates for one forward pass of one example: every output value costs (in/groups)*kh*kw MACs. */
export function convMacs(out: Dims, inC: number, k: readonly [number, number], groups = 1): number {
  return out.c * out.h * out.w * (inC / groups) * k[0] * k[1];
}

/** FLOPs conventionally count a MAC as 2 operations (a multiply and an add). */
export const flopsFromMacs = (macs: number): number => 2 * macs;

export interface LayerReport {
  index: number;
  kind: ConvSpec["kind"];
  out: Dims;
  params: number;
  macs: number;
  /** Receptive field (pixels along one side) of a single output unit, in input pixels. */
  receptiveField: number;
  /** Distance in input pixels between adjacent output units. */
  jump: number;
}

/** Walk a stack, returning per-layer shapes, parameters, MACs and receptive field. */
export function summarize(input: Dims, layers: readonly ConvSpec[]): LayerReport[] {
  let cur = { ...input };
  let rf = 1;
  let jump = 1;
  const out: LayerReport[] = [];
  layers.forEach((l, index) => {
    const s = l.stride ?? (l.kind === "pool" ? l.k[0] : 1);
    const d = l.dilation ?? 1;
    const p = l.pad ?? 0;
    const next: Dims = {
      c: l.kind === "conv" ? (l.out ?? cur.c) : cur.c,
      h: outSize(cur.h, l.k[0], s, p, d, l.ceil),
      w: outSize(cur.w, l.k[1], s, p, d, l.ceil),
    };
    rf += (effectiveKernel(l.k[0], d) - 1) * jump;
    jump *= s;
    const params = l.kind === "conv" ? convParams(cur.c, next.c, l.k, l.groups ?? 1, l.bias ?? true) : 0;
    const macs = l.kind === "conv" ? convMacs(next, cur.c, l.k, l.groups ?? 1) : 0;
    out.push({ index, kind: l.kind, out: next, params, macs, receptiveField: rf, jump });
    cur = next;
  });
  return out;
}

/** Totals over a summary. */
export function totals(reports: readonly LayerReport[]): { params: number; macs: number; flops: number } {
  const params = reports.reduce((a, r) => a + r.params, 0);
  const macs = reports.reduce((a, r) => a + r.macs, 0);
  return { params, macs, flops: flopsFromMacs(macs) };
}

/** Fully connected layer on a flattened tensor, for the "why convolution" comparison. */
export const denseParams = (inFeatures: number, outFeatures: number, bias = true): number =>
  inFeatures * outFeatures + (bias ? outFeatures : 0);
