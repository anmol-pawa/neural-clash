/** Small pure calculus/optimisation solvers used to cross-check the Gradient Gorge deck (answers are computed by numpy; see tests/calculus.test.ts). */

export const centralDiff = (f: (x: number) => number, x: number, h = 1e-5): number => (f(x + h) - f(x - h)) / (2 * h);

/** Gradient descent on f(w) = c/2 w^2 (gradient c w); returns the trajectory including the start. */
export function gdQuadratic(w0: number, lr: number, curvature: number, steps: number, momentum = 0): number[] {
  const out = [w0];
  let w = w0;
  let v = 0;
  for (let i = 0; i < steps; i++) {
    v = momentum * v - lr * curvature * w;
    w += v;
    out.push(w);
  }
  return out;
}

/** Largest learning rate for which gradient descent is stable on a quadratic with the given maximum curvature. */
export const maxStableLr = (maxCurvature: number): number => 2 / maxCurvature;

export interface AdamState { m: number; v: number; t: number }
/** One Adam step on a scalar; returns the update to subtract and the new state. */
export function adamStep(g: number, s: AdamState, lr = 0.001, b1 = 0.9, b2 = 0.999, eps = 1e-8): { delta: number; state: AdamState; mHat: number; vHat: number } {
  const t = s.t + 1;
  const m = b1 * s.m + (1 - b1) * g;
  const v = b2 * s.v + (1 - b2) * g * g;
  const mHat = m / (1 - b1 ** t);
  const vHat = v / (1 - b2 ** t);
  return { delta: (lr * mHat) / (Math.sqrt(vHat) + eps), state: { m, v, t }, mHat, vHat };
}

/** Rescale a gradient so its global L2 norm is at most maxNorm. */
export function clipByNorm(g: readonly number[], maxNorm: number): number[] {
  const n = Math.sqrt(g.reduce((s, x) => s + x * x, 0));
  const k = Math.min(1, maxNorm / n);
  return g.map((x) => x * k);
}
