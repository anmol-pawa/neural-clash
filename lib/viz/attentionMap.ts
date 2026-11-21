// Pure logic for the attention-map visualiser (no DOM): a toy attention demo plus a pixel renderer.
// The embeddings are seeded random vectors, NOT a trained model; the UI says so.
import { rng } from "@/lib/cards/rng";
import { andMasks, causalMask, paddingMask, scaledDotAttention, matmul, transpose, softmaxRows, type Mat } from "@/lib/solvers/attention";

/** Five-step ramp (dark to bright), quantised on purpose so the map reads as pixel art. */
export const RAMP: readonly [number, number, number][] = [
  [15, 23, 42],
  [30, 64, 110],
  [45, 130, 160],
  [94, 234, 212],
  [255, 209, 102],
];

/** Weight in [0, 1] to a ramp colour. Uses sqrt so small-but-nonzero weights remain visible. */
export function heatColor(w: number): [number, number, number] {
  const t = Math.sqrt(Math.min(1, Math.max(0, w)));
  const i = Math.min(RAMP.length - 1, Math.floor(t * RAMP.length));
  return [...RAMP[i]];
}

export interface DemoOptions {
  seed: number;
  dim: number;
  causal: boolean;
  /** Divide scores by sqrt(d). Turning it off shows saturation. */
  scaled: boolean;
  /** Number of trailing tokens treated as padding (keys masked out). */
  padding: number;
}

export interface DemoResult { weights: Mat; mask: boolean[][]; tokens: string[] }

/** Deterministic toy Q/K/V per token position (a token's vector depends on its text and the seed). */
export function demoAttention(tokens: string[], o: DemoOptions): DemoResult {
  const n = tokens.length;
  const vec = (salt: number, tok: string): number[] => {
    let h = o.seed * 2654435761 + salt * 40503;
    for (const ch of tok) h = (Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0);
    const r = rng(h >>> 0);
    return Array.from({ length: o.dim }, () => (r() + r() + r() - 1.5) * 2);
  };
  const Q = tokens.map((t) => vec(1, t));
  const K = tokens.map((t) => vec(2, t));
  const V = tokens.map((t) => vec(3, t));
  let mask: boolean[][] = Array.from({ length: n }, () => Array<boolean>(n).fill(true));
  if (o.causal) mask = andMasks(mask, causalMask(n));
  if (o.padding > 0) mask = andMasks(mask, paddingMask(n, n, Math.max(0, n - o.padding)));
  if (o.scaled) return { weights: scaledDotAttention(Q, K, V, mask).weights, mask, tokens };
  // Unscaled variant: identical maths minus the 1/sqrt(d_k) factor.
  const raw = matmul(Q, transpose(K));
  const scores = raw.map((row, i) => row.map((v, j) => (mask[i][j] ? v : -Infinity)));
  return { weights: softmaxRows(scores), mask, tokens };
}

export interface Pixels { width: number; height: number; data: Uint8ClampedArray }

/**
 * Rasterise a weights matrix: each cell is `cell` x `cell` pixels with a 1px dark gutter.
 * Masked cells get a dark diagonal hatch so "weight 0 because masked" differs from "weight ~0".
 */
export function renderMap(weights: Mat, mask: boolean[][] | undefined, cell: number): Pixels {
  const rows = weights.length;
  const cols = weights[0]?.length ?? 0;
  const width = cols * cell;
  const height = rows * cell;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = Math.floor(y / cell);
      const j = Math.floor(x / cell);
      const gutter = x % cell === cell - 1 || y % cell === cell - 1;
      let c: [number, number, number];
      if (gutter) c = [8, 12, 24];
      else if (mask && !mask[i][j]) c = (x + y) % 4 < 2 ? [26, 32, 52] : [12, 17, 32];
      else c = heatColor(weights[i][j]);
      const o = (y * width + x) * 4;
      data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
    }
  }
  return { width, height, data };
}

/** Largest weight per row, for the "how peaked is each query" readout. */
export const rowPeaks = (weights: Mat): number[] => weights.map((r) => Math.max(...r));

/** Entropy in bits of each row (0 for fully masked rows). */
export const rowEntropy = (weights: Mat): number[] =>
  weights.map((r) => 0 - r.reduce((s, p) => (p > 0 ? s + p * Math.log2(p) : s), 0));
