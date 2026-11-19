/**
 * Attention solvers: stable masked softmax, scaled dot-product attention with an analytic backward pass,
 * the sqrt(d) variance argument, multi-head attention, sinusoidal and rotary (RoPE) position encodings,
 * and attention-matrix memory. Pure arithmetic on plain arrays; gradients are checked against central
 * finite differences in tests/attention.test.ts.
 */

export type Mat = number[][];

const zeros = (r: number, c: number): Mat => Array.from({ length: r }, () => new Array<number>(c).fill(0));

export function matmul(a: Mat, b: Mat): Mat {
  const n = a.length, k = b.length, m = b[0].length;
  const out = zeros(n, m);
  for (let i = 0; i < n; i++) for (let p = 0; p < k; p++) {
    const v = a[i][p];
    for (let j = 0; j < m; j++) out[i][j] += v * b[p][j];
  }
  return out;
}
export const transpose = (a: Mat): Mat => a[0].map((_, j) => a.map((row) => row[j]));

/** Row-wise softmax. Entries equal to -Infinity get weight 0; a fully masked row returns all zeros (not NaN). */
export function softmaxRows(x: Mat): Mat {
  return x.map((row) => {
    const m = Math.max(...row);
    if (m === -Infinity) return row.map(() => 0);
    const e = row.map((v) => Math.exp(v - m));
    const s = e.reduce((a, b) => a + b, 0);
    return e.map((v) => v / s);
  });
}

/** allowed[i][j] is true when query i may attend to key j. Causal: j <= i. */
export const causalMask = (n: number, m = n): boolean[][] =>
  Array.from({ length: n }, (_, i) => Array.from({ length: m }, (_, j) => j <= i));
/** Padding mask: keys at index >= validLen[b] are padding for that sequence. One row of the mask applies to every query. */
export const paddingMask = (nq: number, nk: number, validLen: number): boolean[][] =>
  Array.from({ length: nq }, () => Array.from({ length: nk }, (_, j) => j < validLen));
export const andMasks = (a: boolean[][], b: boolean[][]): boolean[][] => a.map((row, i) => row.map((v, j) => v && b[i][j]));

export interface AttnResult {
  /** n_q x n_k, rows sum to 1 (or 0 when the row is fully masked). */
  weights: Mat;
  /** n_q x d_v. */
  out: Mat;
  scores: Mat;
}

/** softmax(Q K^T / sqrt(d_k) [masked]) V. Q: n_q x d_k, K: n_k x d_k, V: n_k x d_v. */
export function scaledDotAttention(Q: Mat, K: Mat, V: Mat, mask?: boolean[][]): AttnResult {
  const dk = Q[0].length;
  const scale = 1 / Math.sqrt(dk);
  const raw = matmul(Q, transpose(K));
  const scores = raw.map((row, i) => row.map((v, j) => (mask && !mask[i][j] ? -Infinity : v * scale)));
  const weights = softmaxRows(scores);
  return { weights, out: matmul(weights, V), scores };
}

export interface AttnGrads { dQ: Mat; dK: Mat; dV: Mat }

/**
 * Backward of scaledDotAttention given dOut (n_q x d_v).
 * dV = A^T dOut; dA = dOut V^T; dS_ij = A_ij (dA_ij - sum_k A_ik dA_ik); dQ = dS K / sqrt(d); dK = dS^T Q / sqrt(d).
 * Masked entries have A = 0 so their dS is 0 automatically.
 */
export function scaledDotAttentionBackward(Q: Mat, K: Mat, V: Mat, dOut: Mat, mask?: boolean[][]): AttnGrads {
  const { weights: A } = scaledDotAttention(Q, K, V, mask);
  const scale = 1 / Math.sqrt(Q[0].length);
  const dV = matmul(transpose(A), dOut);
  const dA = matmul(dOut, transpose(V));
  const dS = A.map((row, i) => {
    const dot = row.reduce((s, a, j) => s + a * dA[i][j], 0);
    return row.map((a, j) => a * (dA[i][j] - dot));
  });
  const dQ = matmul(dS, K).map((r) => r.map((v) => v * scale));
  const dK = matmul(transpose(dS), Q).map((r) => r.map((v) => v * scale));
  return { dQ, dK, dV };
}

/** Variance of q.k when q, k have i.i.d. zero-mean entries with variances vq, vk: d * vq * vk. Unscaled scores grow like sqrt(d). */
export const dotProductVariance = (d: number, vq = 1, vk = 1): number => d * vq * vk;

/** Largest softmax weight for scores drawn as `score_i = z_i * scoreStd` with fixed z. Shows saturation as the std grows. */
export function maxWeight(z: readonly number[], scoreStd: number): number {
  return Math.max(...softmaxRows([z.map((v) => v * scoreStd)])[0]);
}

export interface MhaParams { Wq: Mat; Wk: Mat; Wv: Mat; Wo: Mat }

/** Split an n x (h*dh) matrix into h matrices of n x dh. */
export const splitHeads = (x: Mat, h: number): Mat[] => {
  const dh = x[0].length / h;
  if (!Number.isInteger(dh)) throw new RangeError("model width must divide by the head count");
  return Array.from({ length: h }, (_, k) => x.map((row) => row.slice(k * dh, (k + 1) * dh)));
};
export const mergeHeads = (heads: Mat[]): Mat => heads[0].map((_, i) => heads.flatMap((h) => h[i]));

/** Multi-head self/cross attention: project, split into h heads, attend per head, concatenate, project out. */
export function multiHeadAttention(xq: Mat, xkv: Mat, p: MhaParams, h: number, mask?: boolean[][]): { out: Mat; weights: Mat[] } {
  const Q = splitHeads(matmul(xq, p.Wq), h), K = splitHeads(matmul(xkv, p.Wk), h), V = splitHeads(matmul(xkv, p.Wv), h);
  const per = Q.map((q, k) => scaledDotAttention(q, K[k], V[k], mask));
  return { out: matmul(mergeHeads(per.map((r) => r.out)), p.Wo), weights: per.map((r) => r.weights) };
}

/** Parameter count of one multi-head attention layer (with biases optional): 4 d^2 (+ 4 d). */
export const mhaParams = (d: number, bias = false): number => 4 * d * d + (bias ? 4 * d : 0);

/** Sinusoidal table (Vaswani et al.): PE[pos, 2i] = sin(pos / base^(2i/d)), PE[pos, 2i+1] = cos(...). d must be even. */
export function sinusoidalPE(n: number, d: number, base = 10000): Mat {
  if (d % 2 !== 0) throw new RangeError("d must be even");
  return Array.from({ length: n }, (_, pos) => Array.from({ length: d }, (_, j) => {
    const i = Math.floor(j / 2);
    const angle = pos / Math.pow(base, (2 * i) / d);
    return j % 2 === 0 ? Math.sin(angle) : Math.cos(angle);
  }));
}

/** RoPE: rotate each consecutive pair (x[2i], x[2i+1]) of a vector at position pos by angle pos * base^(-2i/d). */
export function rope(x: readonly number[], pos: number, base = 10000): number[] {
  const d = x.length;
  if (d % 2 !== 0) throw new RangeError("d must be even");
  const out = new Array<number>(d);
  for (let i = 0; i < d / 2; i++) {
    const a = pos * Math.pow(base, (-2 * i) / d);
    const c = Math.cos(a), s = Math.sin(a);
    out[2 * i] = x[2 * i] * c - x[2 * i + 1] * s;
    out[2 * i + 1] = x[2 * i] * s + x[2 * i + 1] * c;
  }
  return out;
}

/** Bytes of the n x n score (or weight) matrices materialised by naive attention: batch * heads * n^2 * bytesPerElem. */
export const attnMatrixBytes = (n: number, heads: number, bytesPerElem = 2, batch = 1): number => batch * heads * n * n * bytesPerElem;
