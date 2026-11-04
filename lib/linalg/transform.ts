/** Pure 2x2 linear-map maths for the Vector Vale transform visualiser. Row-major [[a, b], [c, d]]; columns are where e1 and e2 land. */
export type Mat2 = readonly [readonly [number, number], readonly [number, number]];
export type Vec2 = readonly [number, number];

export const IDENTITY: Mat2 = [
  [1, 0],
  [0, 1],
];

export const apply = (m: Mat2, v: Vec2): Vec2 => [m[0][0] * v[0] + m[0][1] * v[1], m[1][0] * v[0] + m[1][1] * v[1]];
export const det = (m: Mat2): number => m[0][0] * m[1][1] - m[0][1] * m[1][0];
export const trace = (m: Mat2): number => m[0][0] + m[1][1];

/** A·B: apply B first, then A (the order matters; it is the whole point of composition). */
export const compose = (a: Mat2, b: Mat2): Mat2 => [
  [a[0][0] * b[0][0] + a[0][1] * b[1][0], a[0][0] * b[0][1] + a[0][1] * b[1][1]],
  [a[1][0] * b[0][0] + a[1][1] * b[1][0], a[1][0] * b[0][1] + a[1][1] * b[1][1]],
];

export const inverse = (m: Mat2): Mat2 | null => {
  const dt = det(m);
  if (Math.abs(dt) < 1e-12) return null;
  return [
    [m[1][1] / dt, -m[0][1] / dt],
    [-m[1][0] / dt, m[0][0] / dt],
  ];
};

export const rotation = (deg: number): Mat2 => {
  const t = (deg * Math.PI) / 180;
  const c = Math.cos(t);
  const s = Math.sin(t);
  return [
    [c, -s],
    [s, c],
  ];
};

export interface Eigen {
  /** Real eigenvalues (descending), or empty when the map rotates every direction. */
  values: number[];
  /** Unit eigenvector per real eigenvalue; for a scalar map (every direction is an eigenvector) both axes are listed. */
  vectors: Vec2[];
  /** For complex eigenvalues: modulus and rotation angle in degrees. */
  complex?: { modulus: number; angleDeg: number };
}

const unit = (v: Vec2): Vec2 => {
  const n = Math.hypot(v[0], v[1]);
  return [v[0] / n, v[1] / n];
};

/** Eigen-decomposition of a general 2x2 via the characteristic polynomial λ² − tr·λ + det = 0. */
export function eigen(m: Mat2): Eigen {
  const [[a, b], [c, d]] = m;
  const tr = a + d;
  const dt = det(m);
  const disc = (tr * tr) / 4 - dt;
  const eps = 1e-9;
  if (disc < -eps) {
    const modulus = Math.sqrt(dt);
    const angleDeg = (Math.atan2(Math.sqrt(-disc), tr / 2) * 180) / Math.PI;
    return { values: [], vectors: [], complex: { modulus, angleDeg } };
  }
  const r = Math.sqrt(Math.max(0, disc));
  const values = [tr / 2 + r, tr / 2 - r];
  if (r < eps) {
    // Repeated root: a scalar map has every direction; otherwise a single (defective) direction.
    if (Math.abs(b) < eps && Math.abs(c) < eps) return { values: [values[0]], vectors: [[1, 0], [0, 1]] };
    const lam = values[0];
    const v: Vec2 = Math.abs(b) > eps ? [b, lam - a] : [lam - d, c];
    return { values: [lam], vectors: [unit(v)] };
  }
  const vectors = values.map((lam): Vec2 => {
    if (Math.abs(b) > eps) return unit([b, lam - a]);
    if (Math.abs(c) > eps) return unit([lam - d, c]);
    return Math.abs(lam - a) < Math.abs(lam - d) ? [1, 0] : [0, 1];
  });
  return { values, vectors };
}

export type MapKind = "identity" | "rotation" | "scale" | "reflection" | "shear" | "squash" | "collapse" | "general";

/** Name the map in words a learner would use; "collapse" means rank < 2 (information is destroyed). */
export function classify(m: Mat2): MapKind {
  const eps = 1e-6;
  const [[a, b], [c, d]] = m;
  const dt = det(m);
  if (Math.abs(a - 1) < eps && Math.abs(d - 1) < eps && Math.abs(b) < eps && Math.abs(c) < eps) return "identity";
  if (Math.abs(dt) < eps) return "collapse";
  const orthogonal = Math.abs(a * a + c * c - 1) < eps && Math.abs(b * b + d * d - 1) < eps && Math.abs(a * b + c * d) < eps;
  if (orthogonal) return dt > 0 ? "rotation" : "reflection";
  if (Math.abs(b) < eps && Math.abs(c) < eps) return a > 0 && d > 0 ? "scale" : "squash";
  const e = eigen(m);
  if (e.values.length === 1 && Math.abs(e.values[0] - 1) < 1e-6 && Math.abs(dt - 1) < eps) return "shear";
  return "general";
}

export const KIND_BLURB: Record<MapKind, string> = {
  identity: "Nothing moves: both basis vectors stay put.",
  rotation: "Lengths and angles are preserved; det = +1. No real direction is merely scaled.",
  scale: "Each axis is stretched on its own; the axes are the eigenvectors.",
  reflection: "A mirror: lengths preserved, orientation flipped (det = −1).",
  shear: "Area is preserved (det = 1) but only one direction stays put: a defective matrix.",
  squash: "Axis-aligned, with a flip on at least one axis.",
  collapse: "det = 0: the plane is flattened onto a line or a point. No inverse exists; information is lost.",
  general: "A mix of stretching and turning. Look for the dashed eigen-directions, if any.",
};

/** Image of the unit square, counter-clockwise from the origin. */
export const unitSquareImage = (m: Mat2): Vec2[] => (
  [[0, 0], [1, 0], [1, 1], [0, 1]] as Vec2[]
).map((p) => apply(m, p));
