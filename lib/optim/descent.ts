/** Pure 2D optimiser playground: loss surfaces with analytic gradients, and SGD / momentum / Adam trajectories on them. */

export type Vec2 = readonly [number, number];
export type OptimizerKind = "sgd" | "momentum" | "adam";
export type SurfaceId = "bowl" | "ravine" | "valley";

export interface Surface {
  id: SurfaceId;
  label: string;
  blurb: string;
  f: (p: Vec2) => number;
  grad: (p: Vec2) => [number, number];
  start: Vec2;
  /** Known minimiser. */
  optimum: Vec2;
  /** Largest Hessian eigenvalue near the optimum (for the 2/L stability bound); undefined if not constant. */
  maxCurvature?: number;
  /** Half-width of the plotted region. */
  range: number;
}

const quad = (a: number, b: number) => ({
  f: (p: Vec2) => 0.5 * (a * p[0] * p[0] + b * p[1] * p[1]),
  grad: (p: Vec2): [number, number] => [a * p[0], b * p[1]],
  maxCurvature: Math.max(a, b),
});

export const SURFACES: Record<SurfaceId, Surface> = {
  bowl: {
    id: "bowl", label: "Round bowl", range: 4, start: [3, 3], optimum: [0, 0],
    blurb: "Equal curvature in every direction (condition number 1): the gentlest case.",
    ...quad(1, 1),
  },
  ravine: {
    id: "ravine", label: "Narrow ravine", range: 4, start: [3.5, 2.5], optimum: [0, 0],
    blurb: "Curvature 20 across, 1 along (condition number 20). The step size is capped by the steep wall, so progress along the floor crawls.",
    ...quad(1, 20),
  },
  valley: {
    id: "valley", label: "Curved valley", range: 2, start: [-1.2, 1.2], optimum: [1, 1],
    blurb: "Rosenbrock: a banana-shaped floor. Not convex-quadratic, so the stability bound is only local.",
    f: (p) => (1 - p[0]) ** 2 + 100 * (p[1] - p[0] ** 2) ** 2,
    grad: (p) => [-2 * (1 - p[0]) - 400 * p[0] * (p[1] - p[0] ** 2), 200 * (p[1] - p[0] ** 2)],
  },
};

export interface RunConfig {
  surface: SurfaceId;
  optimizer: OptimizerKind;
  lr: number;
  /** Momentum coefficient (momentum optimiser) or beta1 (Adam). */
  beta1?: number;
  beta2?: number;
  steps: number;
}

export interface Trajectory {
  points: [number, number][];
  losses: number[];
  /** True if the loss left the finite range or grew past 1e6 times its start. */
  diverged: boolean;
}

export function runDescent(cfg: RunConfig): Trajectory {
  const s = SURFACES[cfg.surface];
  const beta1 = cfg.beta1 ?? (cfg.optimizer === "adam" ? 0.9 : 0.9);
  const beta2 = cfg.beta2 ?? 0.999;
  let p: [number, number] = [s.start[0], s.start[1]];
  let vel: [number, number] = [0, 0];
  let m: [number, number] = [0, 0];
  let v: [number, number] = [0, 0];
  const points: [number, number][] = [[p[0], p[1]]];
  const losses = [s.f(p)];
  const limit = Math.max(1, losses[0]) * 1e6;
  let diverged = false;
  for (let t = 1; t <= cfg.steps; t++) {
    const g = s.grad(p);
    if (cfg.optimizer === "sgd") {
      p = [p[0] - cfg.lr * g[0], p[1] - cfg.lr * g[1]];
    } else if (cfg.optimizer === "momentum") {
      vel = [beta1 * vel[0] - cfg.lr * g[0], beta1 * vel[1] - cfg.lr * g[1]];
      p = [p[0] + vel[0], p[1] + vel[1]];
    } else {
      m = [beta1 * m[0] + (1 - beta1) * g[0], beta1 * m[1] + (1 - beta1) * g[1]];
      v = [beta2 * v[0] + (1 - beta2) * g[0] * g[0], beta2 * v[1] + (1 - beta2) * g[1] * g[1]];
      const c1 = 1 - beta1 ** t;
      const c2 = 1 - beta2 ** t;
      p = [p[0] - (cfg.lr * (m[0] / c1)) / (Math.sqrt(v[0] / c2) + 1e-8), p[1] - (cfg.lr * (m[1] / c1)) / (Math.sqrt(v[1] / c2) + 1e-8)];
    }
    const l = s.f(p);
    if (!Number.isFinite(l) || l > limit) { diverged = true; break; }
    points.push([p[0], p[1]]);
    losses.push(l);
  }
  return { points, losses, diverged };
}

/** First step index at which the loss falls below tol, or null. */
export function stepsToReach(losses: readonly number[], tol: number): number | null {
  const i = losses.findIndex((l) => l < tol);
  return i < 0 ? null : i;
}

/** Plain-language verdict on a run, for the readout. */
export function verdict(cfg: RunConfig, tr: Trajectory): string {
  const s = SURFACES[cfg.surface];
  if (tr.diverged) {
    const bound = s.maxCurvature ? ` For plain gradient descent here the learning rate must stay below 2/L = ${(2 / s.maxCurvature).toFixed(2)}.` : "";
    return `Diverged: the steps overshoot more than they correct.${bound}`;
  }
  const last = tr.losses[tr.losses.length - 1];
  if (last < 1e-6) return `Converged (loss ${last.toExponential(1)}) in ${stepsToReach(tr.losses, 1e-6)} steps.`;
  if (last < tr.losses[0] * 0.01) return `Close: loss fell ${(tr.losses[0] / Math.max(last, 1e-300)).toFixed(0)}x but is still dropping or oscillating.`;
  return "Slow: little progress yet. Try a larger step, momentum or Adam, or more steps.";
}
