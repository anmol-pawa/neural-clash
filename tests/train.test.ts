import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { makeSplit, makeToy, polyFeatures } from "../lib/train/datasets";
import { BOUND, GRID, boundaryGrid, runSession, splitFor, type SessionEvent, type SessionRequest } from "@/lib/train/session";
import { design, evaluate, lossGrad, score, sigmoid, train } from "../lib/train/linear";

const py = (job: object) =>
  JSON.parse(
    execFileSync("python3", ["-I", "tests/helpers/train_ref.py"], {
      input: JSON.stringify(job),
      env: { ...process.env, PATH: `/usr/bin:${process.env.PATH}` },
    }).toString(),
  ) as { w: number[]; history: number[] };

describe("datasets", () => {
  it("are deterministic per seed and balanced", () => {
    expect(makeToy("xor", 40, 0.2, 7)).toEqual(makeToy("xor", 40, 0.2, 7));
    expect(makeToy("xor", 40, 0.2, 7)).not.toEqual(makeToy("xor", 40, 0.2, 8));
    expect(makeToy("blobs", 40, 0.3, 1).y.filter((v) => v === 1)).toHaveLength(20);
    expect(makeToy("line", 10, 0, 1).task).toBe("regression");
  });
  it("keeps the hidden test set disjoint from train", () => {
    const { train: a, test: b } = makeSplit("moons", 50, 50, 0.1, 3);
    const seen = new Set(a.X.map((p) => p.join(",")));
    expect(b.X.some((p) => seen.has(p.join(",")))).toBe(false);
  });
  it("polyFeatures orders terms x1, x2, x1², x1·x2, x2²", () => {
    expect(polyFeatures([[2, 3]], 2)).toEqual([[2, 3, 4, 6, 9]]);
  });
});

describe("gradients (finite differences)", () => {
  for (const kind of ["linear", "logistic"] as const) {
    it(`${kind} analytic gradient matches central differences, with L2`, () => {
      const d = makeToy(kind === "linear" ? "line" : "moons", 30, 0.2, 5);
      const A = design(d.X, 2);
      const w = A[0].map((_, j) => 0.3 * Math.sin(j + 1));
      const { grad } = lossGrad(kind, w, A, d.y, 0.05);
      const h = 1e-6;
      for (let j = 0; j < w.length; j++) {
        const up = [...w]; up[j] += h;
        const dn = [...w]; dn[j] -= h;
        const fd = (lossGrad(kind, up, A, d.y, 0.05).loss - lossGrad(kind, dn, A, d.y, 0.05).loss) / (2 * h);
        expect(grad[j]).toBeCloseTo(fd, 6);
      }
    });
  }
  it("logistic loss is stable for huge logits", () => {
    const A = [[1, 1000]];
    expect(lossGrad("logistic", [0, 1], A, [0]).loss).toBeCloseTo(1000, 6);
    expect(lossGrad("logistic", [0, -1], A, [0]).loss).toBeLessThan(1e-300);
    expect(sigmoid(-1000)).toBe(0);
  });
});

describe("equivalence with the numpy reference", () => {
  const cases = [
    { kind: "line" as const, model: "linear" as const, lr: 0.1, l2: 0, degree: 1, epochs: 60 },
    { kind: "line" as const, model: "linear" as const, lr: 0.05, l2: 0.01, degree: 3, epochs: 80 },
    { kind: "blobs" as const, model: "logistic" as const, lr: 0.5, l2: 0, degree: 1, epochs: 100 },
    { kind: "moons" as const, model: "logistic" as const, lr: 0.3, l2: 0.02, degree: 3, epochs: 120 },
  ];
  for (const c of cases) {
    it(`${c.model} on ${c.kind} (degree ${c.degree}, l2 ${c.l2}) matches over ${c.epochs} steps`, () => {
      const d = makeToy(c.kind, 60, 0.25, 11);
      const t = train(d, { model: c.model, lr: c.lr, epochs: c.epochs, l2: c.l2, degree: c.degree });
      const ref = py({ X: d.X, y: d.y, model: c.model, lr: c.lr, l2: c.l2, degree: c.degree, epochs: c.epochs });
      expect(t.w).toHaveLength(ref.w.length);
      t.w.forEach((v, i) => expect(Math.abs(v - ref.w[i])).toBeLessThan(1e-9));
      t.history.forEach((p, i) => expect(Math.abs(p.trainLoss - ref.history[i])).toBeLessThan(1e-9));
    });
  }
});

describe("training behaviour", () => {
  it("linear regression recovers the planted line and scores R² near 1 on the hidden set", () => {
    const { train: tr, test } = makeSplit("line", 80, 80, 0.05, 2);
    const t = train(tr, { model: "linear", lr: 0.3, epochs: 400 });
    expect(t.w[1]).toBeCloseTo(1.5, 1);
    expect(t.w[2]).toBeCloseTo(-0.7, 1);
    expect(evaluate(t, test).r2).toBeGreaterThan(0.95);
  });
  it("logistic separates blobs but cannot solve XOR with linear features", () => {
    const b = makeSplit("blobs", 100, 100, 0.4, 4);
    const x = makeSplit("xor", 100, 100, 0.2, 4);
    const tb = train(b.train, { model: "logistic", lr: 0.5, epochs: 300 });
    const tx = train(x.train, { model: "logistic", lr: 0.5, epochs: 300 });
    expect(score(evaluate(tb, b.test))).toBeGreaterThan(0.9);
    expect(score(evaluate(tx, x.test))).toBeLessThan(0.7);
    // degree 2 adds x1·x2, which makes XOR linearly separable
    const tx2 = train(x.train, { model: "logistic", lr: 0.5, epochs: 600, degree: 2 });
    expect(score(evaluate(tx2, x.test))).toBeGreaterThan(0.9);
  });
  it("high degree overfits a tiny noisy set: train loss falls below test loss", () => {
    const s = makeSplit("line", 12, 200, 0.5, 9);
    const t = train(s.train, { model: "linear", lr: 0.02, epochs: 6000, degree: 5 });
    const gap = evaluate(t, s.test).loss - evaluate(t, s.train).loss;
    expect(gap).toBeGreaterThan(0.05);
    // L2 narrows the gap
    const reg = train(s.train, { model: "linear", lr: 0.02, epochs: 6000, degree: 5, l2: 0.05 });
    expect(evaluate(reg, s.test).loss).toBeLessThan(evaluate(t, s.test).loss);
  });
  it("mini-batch SGD is seeded and still converges", () => {
    const d = makeToy("blobs", 100, 0.4, 6);
    const cfg = { model: "logistic" as const, lr: 0.3, epochs: 60, batchSize: 16, seed: 3 };
    const a = train(d, cfg);
    expect(train(d, cfg).w).toEqual(a.w);
    expect(a.history.at(-1)!.trainLoss).toBeLessThan(a.history[0].trainLoss * 0.5);
  });
  it("records validation loss only when a monitor set is given and reports parameter count", () => {
    const s = makeSplit("blobs", 40, 40, 0.3, 1);
    expect(train(s.train, { model: "logistic", lr: 0.3, epochs: 3 }).history[0].valLoss).toBeUndefined();
    const t = train(s.train, { model: "logistic", lr: 0.3, epochs: 3, degree: 2 }, s.test);
    expect(t.history[0].valLoss).toBeGreaterThan(0);
    expect(t.params).toBe(6);
  });
});

describe("companion bridge", () => {
  it("feeds measured metrics into companionStats; an overfit model has weaker defence", async () => {
    const { companionStats } = await import("../lib/labs/companion");
    const { companionMetrics } = await import("../lib/train/linear");
    const s = makeSplit("line", 12, 200, 0.5, 9);
    const good = train(s.train, { model: "linear", lr: 0.3, epochs: 300 });
    const over = train(s.train, { model: "linear", lr: 0.02, epochs: 6000, degree: 5 });
    const g = companionStats(companionMetrics(good, s.train, s.test));
    const o = companionStats(companionMetrics(over, s.train, s.test));
    expect(g.defence).toBeGreaterThan(o.defence);
    expect(g.speed).toBeGreaterThan(o.speed);
  });
});


describe("training session (worker payload)", () => {
  const req: SessionRequest = { kind: "blobs", nTrain: 60, nTest: 200, noise: 0.5, seed: 5, cfg: { model: "logistic", lr: 0.5, epochs: 40, seed: 5 }, frames: 8 };
  const run = (r: SessionRequest) => {
    const ev: SessionEvent[] = [];
    runSession(r, (e) => ev.push(e));
    return ev;
  };

  it("streams a bounded number of frames, then a done event with a final grid", () => {
    const ev = run(req);
    const epochs = ev.filter((e) => e.type === "epoch");
    expect(epochs.length).toBeGreaterThanOrEqual(8);
    expect(epochs.length).toBeLessThanOrEqual(12);
    expect(ev[ev.length - 1].type).toBe("done");
    for (const e of epochs) if (e.type === "epoch") expect(e.grid).toHaveLength(GRID * GRID);
  });

  it("is deterministic and matches a direct train() call", () => {
    const a = run(req);
    const b = run(req);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const { train: tr, val } = splitFor(req);
    const t = train(tr, req.cfg, val);
    const first = a.find((e) => e.type === "epoch");
    expect(first && first.type === "epoch" && first.point.trainLoss).toBeCloseTo(t.history[0].trainLoss, 12);
  });

  it("the sealed hidden-set score equals evaluate() on the test split, and test/val/train are distinct", () => {
    const done = run(req).pop();
    if (!done || done.type !== "done") throw new Error("no done");
    const s = splitFor(req);
    expect(s.test.X[0]).not.toEqual(s.val.X[0]);
    expect(s.train.X[0]).not.toEqual(s.test.X[0]);
    const t = train(s.train, req.cfg, s.val);
    expect(done.sealed.test.accuracy).toBeCloseTo(evaluate(t, s.test).accuracy, 12);
    expect(done.sealed.test.accuracy).toBeGreaterThan(0.85);
  });

  it("the boundary grid is oriented: x1 grows left to right, x2 grows bottom to top", () => {
    const t = { config: { model: "logistic" as const, lr: 0, epochs: 0, batchSize: 0, l2: 0, degree: 1, seed: 0 }, w: [0, 1, 1], params: 3 };
    const g = boundaryGrid(t);
    const at = (r: number, c: number) => g[r * GRID + c];
    expect(at(0, GRID - 1)).toBeGreaterThan(0.9); // top-right: x1,x2 large
    expect(at(GRID - 1, 0)).toBeLessThan(0.1); // bottom-left
    expect(BOUND).toBeGreaterThan(2);
  });
});
