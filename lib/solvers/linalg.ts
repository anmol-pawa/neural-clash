/** Small pure linear-algebra solvers used to cross-check the Vector Vale deck (answers are computed by numpy; see tests/linalg.test.ts). */

export const dot = (u: readonly number[], v: readonly number[]): number => {
  if (u.length !== v.length) throw new Error("dot: length mismatch");
  return u.reduce((s, x, i) => s + x * v[i], 0);
};
export const norm = (u: readonly number[]): number => Math.sqrt(dot(u, u));
export const cosine = (u: readonly number[], v: readonly number[]): number => dot(u, v) / (norm(u) * norm(v));

/** Coefficient c and residual of projecting v onto the line through u. */
export function project(v: readonly number[], u: readonly number[]): { c: number; residual: number[] } {
  const c = dot(v, u) / dot(u, u);
  return { c, residual: v.map((x, i) => x - c * u[i]) };
}

/** Eigenvalues of a symmetric 2x2 [[a, b], [b, d]], ascending. */
export function eigSym2(a: number, b: number, d: number): [number, number] {
  const mean = (a + d) / 2;
  const r = Math.hypot((a - d) / 2, b);
  return [mean - r, mean + r];
}

/** Singular values of a 2x2 matrix (descending): square roots of the eigenvalues of A^T A. */
export function singular2(m: readonly [readonly [number, number], readonly [number, number]]): [number, number] {
  const [[p, q], [r, s]] = m;
  const [lo, hi] = eigSym2(p * p + r * r, p * q + r * s, q * q + s * s);
  return [Math.sqrt(Math.max(hi, 0)), Math.sqrt(Math.max(lo, 0))];
}

/** Variance shares of a 2-D centred data set under the sample covariance (n - 1). */
export function pca2(points: readonly (readonly [number, number])[]): { eigenvalues: [number, number]; share: number } {
  const n = points.length;
  let sxx = 0, sxy = 0, syy = 0;
  for (const [x, y] of points) { sxx += x * x; sxy += x * y; syy += y * y; }
  const [lo, hi] = eigSym2(sxx / (n - 1), sxy / (n - 1), syy / (n - 1));
  return { eigenvalues: [hi, lo], share: hi / (hi + lo) };
}
