import { describe, expect, it } from "vitest";
import { flowByDepth, probGrid, trainXor } from "@/lib/nn/nest";

describe("Neuron Nest playground", () => {
  it("a linear model cannot learn XOR but 4 hidden units can", () => {
    const lin = trainXor(0, 600);
    const mlp = trainXor(4, 1500);
    expect(lin.accuracy).toBeLessThan(0.7);
    expect(mlp.accuracy).toBeGreaterThan(0.95);
    expect(mlp.losses[mlp.losses.length - 1]).toBeLessThan(mlp.losses[0]);
  });
  it("is deterministic and the grid has n*n probabilities", () => {
    const a = trainXor(3, 200, 5), b = trainXor(3, 200, 5);
    expect(a.losses).toEqual(b.losses);
    const g = probGrid(a, 3, 12);
    expect(g).toHaveLength(144);
    expect(g.every((p) => p >= 0 && p <= 1)).toBe(true);
  });
  it("he init keeps ReLU activations alive; tiny init collapses them", () => {
    const he = flowByDepth(20, 64, "relu", "he");
    const tiny = flowByDepth(20, 64, "relu", "tiny");
    expect(he.act[19]).toBeGreaterThan(0.3);
    expect(he.act[19]).toBeLessThan(3);
    expect(tiny.act[19]).toBeLessThan(1e-6);
  });
  it("large init saturates tanh (outputs pinned near +-1) and the backward gradient explodes", () => {
    const big = flowByDepth(20, 64, "tanh", "large");
    const xav = flowByDepth(20, 64, "tanh", "xavier");
    expect(big.act[19]).toBeGreaterThan(0.85); // |tanh| pinned near 1
    expect(big.grad[0] / big.grad[19]).toBeGreaterThan(1e3);
    expect(xav.grad[0] / xav.grad[19]).toBeLessThan(2);
    expect(xav.grad[0] / xav.grad[19]).toBeGreaterThan(0.05);
  });
  it("gradient shrinks toward early layers with tiny init", () => {
    const f = flowByDepth(10, 32, "tanh", "tiny");
    expect(f.grad[0]).toBeLessThan(f.grad[9] * 1e-6);
  });
});
