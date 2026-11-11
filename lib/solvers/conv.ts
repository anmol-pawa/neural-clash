/** Convolution shape, receptive-field and cost solvers for Conv Caverns (CUR F8). Cross-checked by brute force in tests/conv.test.ts. */

export interface Conv1D { k: number; stride?: number; pad?: number; dilation?: number }
export interface Conv2D { kh: number; kw: number; strideH?: number; strideW?: number; padH?: number; padW?: number; dilH?: number; dilW?: number; cin: number; cout: number; groups?: number; bias?: boolean }

/** Span of a dilated kernel: d*(k-1)+1. */
export const effectiveKernel = (k: number, dilation = 1): number => dilation * (k - 1) + 1;

/** floor((n + 2p - d(k-1) - 1) / s) + 1, or 0 when the kernel does not fit. */
export function convOutLen(n: number, { k, stride = 1, pad = 0, dilation = 1 }: Conv1D): number {
  if (k < 1 || stride < 1 || pad < 0 || dilation < 1 || n < 0) throw new RangeError("invalid conv arguments");
  const span = n + 2 * pad - effectiveKernel(k, dilation);
  return span < 0 ? 0 : Math.floor(span / stride) + 1;
}

/** Padding that keeps the size at stride 1 ("same"): needs an odd effective kernel to be symmetric. */
export function samePad(k: number, dilation = 1): number {
  const e = effectiveKernel(k, dilation);
  if (e % 2 === 0) throw new RangeError("symmetric same-padding needs an odd effective kernel");
  return (e - 1) / 2;
}

/** Output spatial size of a 2-D conv. */
export function conv2dOut(h: number, w: number, c: Conv2D): [number, number] {
  return [
    convOutLen(h, { k: c.kh, stride: c.strideH, pad: c.padH, dilation: c.dilH }),
    convOutLen(w, { k: c.kw, stride: c.strideW, pad: c.padW, dilation: c.dilW }),
  ];
}

const groupsOf = (c: Conv2D): number => {
  const g = c.groups ?? 1;
  if (c.cin % g !== 0 || c.cout % g !== 0) throw new RangeError("groups must divide cin and cout");
  return g;
};

/** Learnable parameters: cout * (cin/groups) * kh * kw (+ cout bias). */
export function conv2dParams(c: Conv2D): number {
  return c.cout * (c.cin / groupsOf(c)) * c.kh * c.kw + (c.bias === false ? 0 : c.cout);
}

/** Multiply-accumulates for one image (bias adds excluded). FLOPs are conventionally 2 x MACs. */
export function conv2dMacs(h: number, w: number, c: Conv2D): number {
  const [oh, ow] = conv2dOut(h, w, c);
  return oh * ow * c.cout * (c.cin / groupsOf(c)) * c.kh * c.kw;
}
export const conv2dFlops = (h: number, w: number, c: Conv2D): number => 2 * conv2dMacs(h, w, c);

/** Fully connected layer parameters, for the "why convolve" comparison. */
export const denseParams = (nin: number, nout: number, bias = true): number => nin * nout + (bias ? nout : 0);

export interface RfLayer { k: number; stride?: number; dilation?: number }
export interface RfResult { size: number; jump: number }

/** Receptive field of a stack along one axis: r += (k_eff - 1) * jump; jump *= stride. Padding does not change it. */
export function receptiveField(layers: readonly RfLayer[]): RfResult {
  let r = 1, j = 1;
  for (const l of layers) {
    r += (effectiveKernel(l.k, l.dilation ?? 1) - 1) * j;
    j *= l.stride ?? 1;
  }
  return { size: r, jump: j };
}

/** Number of 3x3 stride-1 layers whose stacked receptive field reaches at least `target` (e.g. 2 layers = 5, 3 layers = 7). */
export const stackedKernelsFor = (k: number, target: number): number => Math.ceil((target - 1) / (k - 1));

/** Spatial size after a pooling window (same formula as a conv; default stride = window). */
export const poolOut = (n: number, window: number, stride = window, pad = 0): number => convOutLen(n, { k: window, stride, pad });
