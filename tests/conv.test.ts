import { describe, expect, it } from "vitest";
import {
  conv2dFlops, conv2dMacs, conv2dOut, conv2dParams, convOutLen, denseParams, effectiveKernel, poolOut, receptiveField, samePad, stackedKernelsFor,
} from "../lib/solvers/conv";

/** Ground truth: slide the dilated window over the padded input and count positions that fit. */
function countPositions(n: number, k: number, s: number, p: number, d: number): number {
  const span = d * (k - 1) + 1;
  let count = 0;
  for (let start = 0; start + span <= n + 2 * p; start += s) count++;
  return count;
}

/** Ground truth receptive field: trace which input indices influence output 0 of a deep, unpadded-in-effect stack. */
function tracedRf(layers: { k: number; stride?: number; dilation?: number }[]): number {
  let needed = new Set<number>([0]); // positions in the final layer's output (a centre far from the borders is equivalent)
  for (let i = layers.length - 1; i >= 0; i--) {
    const { k, stride = 1, dilation = 1 } = layers[i];
    const next = new Set<number>();
    for (const o of needed) for (let t = 0; t < k; t++) next.add(o * stride + t * dilation);
    needed = next;
  }
  const xs = [...needed];
  return Math.max(...xs) - Math.min(...xs) + 1;
}

describe("convOutLen", () => {
  it("matches a brute-force window count over a grid of settings", () => {
    for (let n = 1; n <= 14; n++)
      for (let k = 1; k <= 5; k++)
        for (let s = 1; s <= 3; s++)
          for (let p = 0; p <= 3; p++)
            for (let d = 1; d <= 3; d++)
              expect(convOutLen(n, { k, stride: s, pad: p, dilation: d })).toBe(countPositions(n, k, s, p, d));
  });
  it("known cases", () => {
    expect(convOutLen(32, { k: 3 })).toBe(30);
    expect(convOutLen(32, { k: 3, pad: 1 })).toBe(32);
    expect(convOutLen(224, { k: 7, stride: 2, pad: 3 })).toBe(112);
    expect(convOutLen(5, { k: 3, dilation: 2 })).toBe(1);
    expect(convOutLen(2, { k: 3 })).toBe(0);
  });
  it("same padding keeps size at stride 1 and rejects even kernels", () => {
    for (const k of [1, 3, 5, 7]) for (const d of [1, 2]) expect(convOutLen(17, { k, pad: samePad(k, d), dilation: d })).toBe(17);
    expect(() => samePad(2)).toThrow();
    expect(effectiveKernel(3, 4)).toBe(9);
  });
  it("rejects invalid arguments", () => {
    expect(() => convOutLen(8, { k: 0 })).toThrow();
    expect(() => convOutLen(8, { k: 3, stride: 0 })).toThrow();
  });
});

describe("conv2d cost", () => {
  const c = { kh: 3, kw: 3, cin: 16, cout: 32 };
  it("params, with and without bias, and groups", () => {
    expect(conv2dParams(c)).toBe(32 * 16 * 9 + 32);
    expect(conv2dParams({ ...c, bias: false })).toBe(32 * 16 * 9);
    expect(conv2dParams({ ...c, groups: 16 })).toBe(32 * 1 * 9 + 32);
    expect(() => conv2dParams({ ...c, groups: 5 })).toThrow();
  });
  it("MACs equal output elements times work per element, counted by loops", () => {
    const small = { kh: 3, kw: 2, cin: 2, cout: 3, padH: 1, strideW: 2 };
    const [oh, ow] = conv2dOut(6, 7, small);
    let macs = 0;
    for (let co = 0; co < 3; co++) for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++) for (let ci = 0; ci < 2; ci++) macs += 3 * 2;
    expect(conv2dMacs(6, 7, small)).toBe(macs);
    expect(conv2dFlops(6, 7, small)).toBe(2 * macs);
  });
  it("weight sharing: a 3x3 conv on 16x16x1 -> 8 channels has far fewer params than the dense layer producing the same map", () => {
    const conv = conv2dParams({ kh: 3, kw: 3, cin: 1, cout: 8, padH: 1, padW: 1 });
    const dense = denseParams(16 * 16, 16 * 16 * 8);
    expect(conv).toBe(80);
    expect(dense / conv).toBeGreaterThan(5000);
  });
  it("depthwise-separable saves roughly 1/cout + 1/k^2 of the standard cost", () => {
    const std = conv2dMacs(32, 32, { kh: 3, kw: 3, cin: 64, cout: 64, padH: 1, padW: 1 });
    const dw = conv2dMacs(32, 32, { kh: 3, kw: 3, cin: 64, cout: 64, padH: 1, padW: 1, groups: 64 });
    const pw = conv2dMacs(32, 32, { kh: 1, kw: 1, cin: 64, cout: 64 });
    expect((dw + pw) / std).toBeCloseTo(1 / 64 + 1 / 9, 10);
  });
});

describe("receptiveField", () => {
  it("matches dependency tracing on assorted stacks", () => {
    const stacks = [
      [{ k: 3 }, { k: 3 }],
      [{ k: 3 }, { k: 3 }, { k: 3 }],
      [{ k: 5, stride: 2 }, { k: 3 }, { k: 3, stride: 2 }],
      [{ k: 3, dilation: 1 }, { k: 3, dilation: 2 }, { k: 3, dilation: 4 }],
      [{ k: 7, stride: 2 }, { k: 2, stride: 2 }, { k: 3 }],
    ];
    for (const st of stacks) expect(receptiveField(st).size).toBe(tracedRf(st));
  });
  it("known results: two 3x3 = 5, three = 7; dilations 1,2,4 = 15; jump multiplies strides", () => {
    expect(receptiveField([{ k: 3 }, { k: 3 }]).size).toBe(5);
    expect(receptiveField([{ k: 3 }, { k: 3 }, { k: 3 }]).size).toBe(7);
    expect(receptiveField([{ k: 3 }, { k: 3, dilation: 2 }, { k: 3, dilation: 4 }]).size).toBe(15);
    expect(receptiveField([{ k: 3, stride: 2 }, { k: 3, stride: 2 }]).jump).toBe(4);
    expect(stackedKernelsFor(3, 7)).toBe(3);
    expect(stackedKernelsFor(3, 5)).toBe(2);
  });
  it("three 3x3 layers beat one 7x7 on params at equal receptive field (C channels in and out)", () => {
    const C = 32;
    const three = 3 * conv2dParams({ kh: 3, kw: 3, cin: C, cout: C, bias: false });
    const one = conv2dParams({ kh: 7, kw: 7, cin: C, cout: C, bias: false });
    expect(receptiveField([{ k: 3 }, { k: 3 }, { k: 3 }]).size).toBe(7);
    expect(three / one).toBeCloseTo(27 / 49, 10);
  });
});

describe("pooling", () => {
  it("floors odd sizes", () => {
    expect(poolOut(16, 2)).toBe(8);
    expect(poolOut(15, 2)).toBe(7);
    expect(poolOut(7, 3, 2)).toBe(3);
  });
});
