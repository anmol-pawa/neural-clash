import { describe, it, expect } from "vitest";
import { SURFACES, runDescent, stepsToReach, verdict, type SurfaceId } from "@/lib/optim/descent";
import { centralDiff, gdQuadratic, adamStep } from "@/lib/solvers/calculus";

describe("surfaces", () => {
  it.each(["bowl", "ravine", "valley"] as SurfaceId[])("%s gradient matches finite differences", (id) => {
    const s = SURFACES[id];
    for (const p of [[0.3, -0.7], [1.1, 0.4], [-1.5, 0.9]] as const) {
      const g = s.grad(p);
      expect(g[0]).toBeCloseTo(centralDiff((x) => s.f([x, p[1]]), p[0]), 3);
      expect(g[1]).toBeCloseTo(centralDiff((y) => s.f([p[0], y]), p[1]), 3);
    }
  });
  it("gradient vanishes at the optimum", () => {
    for (const s of Object.values(SURFACES)) {
      const g = s.grad(s.optimum);
      expect(Math.hypot(g[0], g[1])).toBeCloseTo(0, 9);
    }
  });
});

describe("optimisers", () => {
  it("SGD along the ravine's steep axis matches the scalar solver", () => {
    const tr = runDescent({ surface: "ravine", optimizer: "sgd", lr: 0.05, steps: 20 });
    const ref = gdQuadratic(SURFACES.ravine.start[1], 0.05, 20, 20);
    tr.points.forEach((p, i) => expect(p[1]).toBeCloseTo(ref[i], 9));
  });
  it("respects the 2/L stability bound on the ravine", () => {
    const ok = runDescent({ surface: "ravine", optimizer: "sgd", lr: 0.099, steps: 400 });
    const bad = runDescent({ surface: "ravine", optimizer: "sgd", lr: 0.101, steps: 400 });
    expect(ok.diverged).toBe(false);
    expect(bad.diverged).toBe(true);
    expect(verdict({ surface: "ravine", optimizer: "sgd", lr: 0.101, steps: 400 }, bad)).toContain("2/L = 0.10");
  });
  it("momentum (lr 0.03, beta 0.8) beats SGD at its best stable rate (0.09) on the ravine", () => {
    const sgd = runDescent({ surface: "ravine", optimizer: "sgd", lr: 0.09, steps: 600 });
    const mom = runDescent({ surface: "ravine", optimizer: "momentum", lr: 0.03, beta1: 0.8, steps: 600 });
    const a = stepsToReach(sgd.losses, 1e-6);
    const b = stepsToReach(mom.losses, 1e-6);
    expect(b).not.toBeNull();
    expect(a === null || b! < a!).toBe(true);
  });
  it("Adam's first step moves each coordinate by about lr (sign-like), matching adamStep", () => {
    const tr = runDescent({ surface: "ravine", optimizer: "adam", lr: 0.1, steps: 1 });
    const s = SURFACES.ravine;
    const g = s.grad(s.start);
    const d = adamStep(g[0], { m: 0, v: 0, t: 0 }, 0.1).delta;
    expect(tr.points[1][0]).toBeCloseTo(s.start[0] - d, 9);
    expect(s.start[0] - tr.points[1][0]).toBeCloseTo(0.1, 6);
    expect(s.start[1] - tr.points[1][1]).toBeCloseTo(0.1, 6);
  });
  it("Adam solves the bowl", () => {
    const tr = runDescent({ surface: "bowl", optimizer: "adam", lr: 0.2, steps: 400 });
    expect(tr.losses[tr.losses.length - 1]).toBeLessThan(1e-2);
  });
  it("is deterministic and reports a verdict", () => {
    const c = { surface: "valley", optimizer: "momentum", lr: 0.0005, steps: 200 } as const;
    expect(runDescent(c)).toEqual(runDescent(c));
    expect(typeof verdict(c, runDescent(c))).toBe("string");
  });
});
