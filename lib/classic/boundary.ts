/** Pure classical-ML playground: a seeded 2-D dataset, three classifiers (k-NN, greedy tree, logistic) and a polynomial bias-variance sweep. */
import { rng } from "@/lib/cards/rng";

export interface Pt { x: number; y: number; label: 0 | 1 }
export type DataId = "blobs" | "moons" | "xor";
export type Predictor = (x: number, y: number) => 0 | 1;

function gauss(u: () => number): number {
  return Math.sqrt(-2 * Math.log(1 - u())) * Math.cos(2 * Math.PI * u());
}

/** Points live in [0,1]^2. Deterministic given the seed. */
export function makeData(id: DataId, n: number, noise: number, seed = 3): Pt[] {
  const u = rng(seed);
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const label = (i % 2) as 0 | 1;
    let x: number, y: number;
    if (id === "blobs") {
      x = (label ? 0.68 : 0.32) + noise * gauss(u);
      y = (label ? 0.62 : 0.4) + noise * gauss(u);
    } else if (id === "moons") {
      const t = Math.PI * u();
      // Two interleaved half-circles: an upper arc (class 0) and a lower arc shifted right and down (class 1).
      x = label ? 0.65 - 0.3 * Math.cos(t) : 0.35 + 0.3 * Math.cos(t);
      y = label ? 0.42 - 0.25 * Math.sin(t) : 0.58 + 0.25 * Math.sin(t);
      x += noise * gauss(u); y += noise * gauss(u);
    } else {
      const qx = u() < 0.5 ? 0.27 : 0.73;
      const qy = label ? (qx < 0.5 ? 0.73 : 0.27) : (qx < 0.5 ? 0.27 : 0.73);
      x = qx + noise * gauss(u); y = qy + noise * gauss(u);
    }
    out.push({ x, y, label });
  }
  return out;
}

/** k-NN with majority vote; ties go to class 0 (documented, deterministic). Features are already on one scale. */
export function knn(train: Pt[], k: number): Predictor {
  return (x, y) => {
    const d = train.map((p) => ({ d: (p.x - x) ** 2 + (p.y - y) ** 2, l: p.label })).sort((a, b) => a.d - b.d || a.l - b.l);
    let ones = 0;
    const kk = Math.min(k, d.length);
    for (let i = 0; i < kk; i++) ones += d[i].l;
    return ones * 2 > kk ? 1 : 0;
  };
}

export function gini2(n0: number, n1: number): number {
  const n = n0 + n1;
  return n === 0 ? 0 : 1 - (n0 / n) ** 2 - (n1 / n) ** 2;
}

type Node = { leaf: 0 | 1 } | { axis: "x" | "y"; t: number; lo: Node; hi: Node };

function majority(pts: Pt[]): 0 | 1 {
  const ones = pts.reduce((s, p) => s + p.label, 0);
  return ones * 2 > pts.length ? 1 : 0;
}

function grow(pts: Pt[], depth: number): Node {
  const ones = pts.reduce((s, p) => s + p.label, 0);
  if (depth === 0 || ones === 0 || ones === pts.length) return { leaf: majority(pts) };
  let best: { gain: number; axis: "x" | "y"; t: number } | null = null;
  const parent = gini2(pts.length - ones, ones);
  for (const axis of ["x", "y"] as const) {
    const s = [...pts].sort((a, b) => a[axis] - b[axis]);
    let l0 = 0, l1 = 0;
    for (let i = 0; i < s.length - 1; i++) {
      if (s[i].label) l1++; else l0++;
      if (s[i][axis] === s[i + 1][axis]) continue;
      const nl = i + 1, nr = s.length - nl;
      const r1 = ones - l1, r0 = nr - r1;
      const gain = parent - (nl / s.length) * gini2(l0, l1) - (nr / s.length) * gini2(r0, r1);
      if (!best || gain > best.gain + 1e-12) best = { gain, axis, t: (s[i][axis] + s[i + 1][axis]) / 2 };
    }
  }
  if (!best || best.gain <= 1e-12) return { leaf: majority(pts) };
  const { axis, t } = best;
  return { axis, t, lo: grow(pts.filter((p) => p[axis] <= t), depth - 1), hi: grow(pts.filter((p) => p[axis] > t), depth - 1) };
}

/** Greedy Gini tree; depth 0 is a single majority leaf. */
export function tree(train: Pt[], maxDepth: number): Predictor {
  const root = grow(train, maxDepth);
  return (x, y) => {
    let n = root;
    while (!("leaf" in n)) n = (n.axis === "x" ? x : y) <= n.t ? n.lo : n.hi;
    return n.leaf;
  };
}

/** Batch-GD logistic regression on (x, y) centred at 0.5; stable sigmoid. */
export function logistic(train: Pt[], steps = 400, lr = 3): Predictor & { w: [number, number]; b: number } {
  let w0 = 0, w1 = 0, b = 0;
  const sig = (z: number) => (z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z)));
  for (let s = 0; s < steps; s++) {
    let g0 = 0, g1 = 0, gb = 0;
    for (const p of train) {
      const e = sig(w0 * (p.x - 0.5) + w1 * (p.y - 0.5) + b) - p.label;
      g0 += e * (p.x - 0.5); g1 += e * (p.y - 0.5); gb += e;
    }
    w0 -= (lr * g0) / train.length; w1 -= (lr * g1) / train.length; b -= (lr * gb) / train.length;
  }
  const f = ((x: number, y: number) => (w0 * (x - 0.5) + w1 * (y - 0.5) + b > 0 ? 1 : 0)) as Predictor & { w: [number, number]; b: number };
  f.w = [w0, w1]; f.b = b;
  return f;
}

export const accuracy = (f: Predictor, pts: Pt[]): number => (pts.length ? pts.filter((p) => f(p.x, p.y) === p.label).length / pts.length : 0);

export interface BiasVariancePoint { degree: number; trainMse: number; testMse: number }

/** Solve the (d+1)x(d+1) normal equations with ridge `eps` on a centred Vandermonde basis (Gaussian elimination, partial pivoting). */
export function polyFit(xs: number[], ys: number[], degree: number, eps = 1e-9): number[] {
  const m = degree + 1;
  const A = Array.from({ length: m }, () => new Array<number>(m + 1).fill(0));
  for (let i = 0; i < xs.length; i++) {
    const t = xs[i] - 0.5;
    const pw = Array.from({ length: m }, (_, j) => t ** j);
    for (let r = 0; r < m; r++) { for (let c = 0; c < m; c++) A[r][c] += pw[r] * pw[c]; A[r][m] += pw[r] * ys[i]; }
  }
  for (let r = 0; r < m; r++) A[r][r] += eps;
  for (let c = 0; c < m; c++) {
    let p = c;
    for (let r = c + 1; r < m; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = c + 1; r < m; r++) { const f = A[r][c] / A[c][c]; for (let k = c; k <= m; k++) A[r][k] -= f * A[c][k]; }
  }
  const w = new Array<number>(m).fill(0);
  for (let r = m - 1; r >= 0; r--) { let s = A[r][m]; for (let k = r + 1; k < m; k++) s -= A[r][k] * w[k]; w[r] = s / A[r][r]; }
  return w;
}

export const polyEval = (w: number[], x: number): number => w.reduce((s, c, j) => s + c * (x - 0.5) ** j, 0);
export const truth = (x: number): number => Math.sin(2 * Math.PI * x);

/** Train/test error against degree for y = sin(2 pi x) + noise. */
export function biasVariance(nTrain: number, noise: number, maxDegree: number, seed = 5): BiasVariancePoint[] {
  const u = rng(seed);
  const draw = (n: number) => { const xs = Array.from({ length: n }, () => u()); return { xs, ys: xs.map((x) => truth(x) + noise * gauss(u)) }; };
  const tr = draw(nTrain), te = draw(400);
  const mse = (w: number[], d: { xs: number[]; ys: number[] }) => d.xs.reduce((s, x, i) => s + (polyEval(w, x) - d.ys[i]) ** 2, 0) / d.xs.length;
  const out: BiasVariancePoint[] = [];
  for (let degree = 0; degree <= maxDegree; degree++) { const w = polyFit(tr.xs, tr.ys, degree); out.push({ degree, trainMse: mse(w, tr), testMse: mse(w, te) }); }
  return out;
}
