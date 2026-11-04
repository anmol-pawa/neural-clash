import { describe, it, expect } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { apply, classify, compose, det, eigen, inverse, rotation, trace, unitSquareImage, type Mat2 } from "@/lib/linalg/transform";
import { singular2 } from "@/lib/solvers/linalg";

const py = ["python3", "/usr/bin/python3"].find((b) => spawnSync(b, ["-I", "-c", "import numpy"]).status === 0) ?? "python3";
const close = (x: number, y: number, tol = 1e-9) => expect(Math.abs(x - y)).toBeLessThan(tol);

describe("2x2 transforms", () => {
  it("columns are the images of the basis vectors", () => {
    const m: Mat2 = [[2, 1], [0, 3]];
    expect(apply(m, [1, 0])).toEqual([2, 0]);
    expect(apply(m, [0, 1])).toEqual([1, 3]);
    expect(unitSquareImage(m)[2]).toEqual([3, 3]);
  });

  it("composition applies the right factor first and is not commutative", () => {
    const shear: Mat2 = [[1, 1], [0, 1]];
    const rot = rotation(90);
    const v: [number, number] = [1, 0];
    const ab = apply(compose(shear, rot), v);
    const viaSteps = apply(shear, apply(rot, v));
    close(ab[0], viaSteps[0]);
    close(ab[1], viaSteps[1]);
    const ba = compose(rot, shear);
    expect(Math.abs(ba[0][0] - compose(shear, rot)[0][0]) + Math.abs(ba[0][1] - compose(shear, rot)[0][1])).toBeGreaterThan(0.5);
  });

  it("inverse undoes the map and is null when det = 0", () => {
    const m: Mat2 = [[2, 1], [1, 3]];
    const p = compose(m, inverse(m)!);
    close(p[0][0], 1); close(p[1][1], 1); close(p[0][1], 0); close(p[1][0], 0);
    expect(inverse([[1, 2], [2, 4]])).toBeNull();
  });

  it("classifies the standard maps", () => {
    expect(classify([[1, 0], [0, 1]])).toBe("identity");
    expect(classify(rotation(30))).toBe("rotation");
    expect(classify([[1, 0], [0, -1]])).toBe("reflection");
    expect(classify([[1, 1], [0, 1]])).toBe("shear");
    expect(classify([[2, 0], [0, 0.5]])).toBe("scale");
    expect(classify([[1, 2], [2, 4]])).toBe("collapse");
    expect(classify([[2, 1], [1, 3]])).toBe("general");
  });

  it("eigen: real, repeated, defective and complex cases", () => {
    const e = eigen([[2, 1], [1, 2]]);
    close(e.values[0], 3); close(e.values[1], 1);
    const r = eigen(rotation(90));
    expect(r.values).toEqual([]);
    close(r.complex!.modulus, 1); close(r.complex!.angleDeg, 90);
    expect(eigen([[1, 1], [0, 1]]).vectors).toHaveLength(1);
    expect(eigen([[3, 0], [0, 3]]).vectors).toHaveLength(2);
  });

  it("eigenpairs satisfy A v = λ v, and det/trace match the eigenvalues, against numpy on random matrices", () => {
    const rng = (s: number) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32) * 6 - 3;
    const next = rng(7);
    const mats: Mat2[] = Array.from({ length: 30 }, () => [[next(), next()], [next(), next()]] as Mat2);
    const out = JSON.parse(execFileSync(py, ["-I", "-c", `import numpy as np, json,sys
ms=json.loads(sys.argv[1]); print(json.dumps([sorted(np.linalg.eigvals(np.array(m)).real.tolist(),reverse=True) if np.isreal(np.linalg.eigvals(np.array(m))).all() else None for m in ms]))`, JSON.stringify(mats)]).toString()) as (number[] | null)[];
    mats.forEach((m, i) => {
      const e = eigen(m);
      if (out[i] === null) { expect(e.values).toEqual([]); return; }
      e.values.forEach((lam, k) => { close(lam, out[i]![k], 1e-8); const w = apply(m, e.vectors[k]); close(w[0], lam * e.vectors[k][0], 1e-8); close(w[1], lam * e.vectors[k][1], 1e-8); });
      close(e.values[0] * e.values[1], det(m), 1e-8);
      close(e.values[0] + e.values[1], trace(m), 1e-8);
    });
  });

  it("|det| equals the product of singular values (area scale)", () => {
    const m: Mat2 = [[2, 1], [-1, 3]];
    const [s1, s2] = singular2(m);
    close(s1 * s2, Math.abs(det(m)), 1e-9);
  });
});
