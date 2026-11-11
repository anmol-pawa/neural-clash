import { describe, it, expect } from "vitest";
import { analyzeStack, convMacs, convParams, denseCost, type ConvLayer } from "@/lib/solvers/conv";

/** Brute force: map one output unit back to its input interval layer by layer (ignores clipping). */
function bruteRf(layers: readonly ConvLayer[]): number {
  let lo = 0;
  let hi = 0;
  for (let i = layers.length - 1; i >= 0; i--) {
    const l = layers[i];
    const s = l.stride ?? (l.kind === "pool" ? l.kernel : 1);
    const p = l.pad ?? 0;
    const d = l.dilation ?? 1;
    lo = lo * s - p;
    hi = hi * s - p + d * (l.kernel - 1);
  }
  return hi - lo + 1;
}

describe("conv solvers", () => {
  it("receptive field matches interval back-propagation on several stacks", () => {
    const stacks: ConvLayer[][] = [
      [{ kind: "conv", kernel: 3, out: 8 }],
      [{ kind: "conv", kernel: 3, out: 8 }, { kind: "conv", kernel: 3, out: 8 }],
      [{ kind: "conv", kernel: 3, pad: 1, out: 4 }, { kind: "pool", kernel: 2 }, { kind: "conv", kernel: 3, pad: 1, out: 8 }, { kind: "pool", kernel: 2 }],
      [{ kind: "conv", kernel: 3, dilation: 2, out: 4 }, { kind: "conv", kernel: 3, stride: 2, out: 4 }, { kind: "conv", kernel: 5, dilation: 3, pad: 6, out: 4 }],
    ];
    for (const s of stacks) {
      const r = analyzeStack(64, 64, 1, s);
      expect(r[r.length - 1].rf).toBe(bruteRf(s));
    }
  });

  it("two 3x3 convs see 5x5; three see 7x7", () => {
    const c: ConvLayer = { kind: "conv", kernel: 3, out: 4 };
    expect(analyzeStack(32, 32, 1, [c, c]).at(-1)!.rf).toBe(5);
    expect(analyzeStack(32, 32, 1, [c, c, c]).at(-1)!.rf).toBe(7);
  });

  it("params and MACs: 3x3, 1->8 on 16x16 same-padded", () => {
    expect(convParams(1, 8, 3)).toBe(80);
    const [r] = analyzeStack(16, 16, 1, [{ kind: "conv", kernel: 3, pad: 1, out: 8 }]);
    expect([r.h, r.w, r.c]).toEqual([16, 16, 8]);
    expect(r.macs).toBe(convMacs(1, 8, 3, 16, 16));
    expect(r.macs).toBe(8 * 16 * 16 * 9);
  });

  it("MACs equal a literal loop count", () => {
    let count = 0;
    const [inC, outC, k, oh, ow] = [3, 5, 3, 6, 7];
    for (let o = 0; o < outC; o++) for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++) for (let c = 0; c < inC; c++) for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) count++;
    expect(convMacs(inC, outC, k, oh, ow)).toBe(count);
  });

  it("weight sharing: conv has far fewer params than a dense layer on the same map", () => {
    const [r] = analyzeStack(16, 16, 1, [{ kind: "conv", kernel: 3, pad: 1, out: 8 }]);
    const dense = denseCost(16 * 16, r.h * r.w * r.c);
    expect(r.params).toBeLessThan(dense.params / 1000);
  });

  it("pool halves the map and has no params", () => {
    const [r] = analyzeStack(16, 16, 4, [{ kind: "pool", kernel: 2 }]);
    expect([r.h, r.w, r.c, r.params, r.macs, r.jump]).toEqual([8, 8, 4, 0, 0, 2]);
  });

  it("rejects a kernel larger than the padded input", () => {
    expect(() => analyzeStack(2, 2, 1, [{ kind: "conv", kernel: 5, out: 1 }])).toThrow(RangeError);
  });
});
