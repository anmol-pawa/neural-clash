import { describe, it, expect } from "vitest";
import { outSize, transposedOutSize, convParams, convMacs, summarize, totals, denseParams, effectiveKernel, totalPad, type ConvSpec } from "@/lib/solvers/conv";

/** Brute force: slide an explicit window over a padded axis and count positions. */
function countWindows(n: number, k: number, s: number, totalPadding: number, d: number, ceil: boolean): number {
  const span = d * (k - 1) + 1;
  const padded = n + totalPadding;
  let count = 0;
  for (let start = 0; start + span <= padded; start += s) count++;
  if (ceil && (padded - span) % s !== 0) {
    // ceil mode admits one extra, partially-covered window
    count++;
  }
  return count;
}

describe("outSize", () => {
  it("matches brute-force window counting across a parameter grid", () => {
    for (let n = 1; n <= 14; n++)
      for (let k = 1; k <= 5; k++)
        for (const s of [1, 2, 3])
          for (const p of [0, 1, 2])
            for (const d of [1, 2]) {
              if (n + 2 * p < d * (k - 1) + 1) continue;
              expect(outSize(n, k, s, p, d)).toBe(countWindows(n, k, s, 2 * p, d, false));
              expect(outSize(n, k, s, p, d, true)).toBe(countWindows(n, k, s, 2 * p, d, true));
            }
  });
  it("same padding preserves size at stride 1 for odd and dilated kernels", () => {
    for (const k of [1, 3, 5, 7]) for (const d of [1, 2, 3]) expect(outSize(32, k, 1, "same", d)).toBe(32);
  });
  it("valid padding shrinks by k-1", () => expect(outSize(28, 5, 1, "valid")).toBe(24));
  it("rejects kernels larger than the padded input", () => {
    expect(() => outSize(3, 5)).toThrow(RangeError);
    expect(() => outSize(5, 3, 1, 0, 3)).toThrow(RangeError);
  });
  it("effective kernel and named padding", () => {
    expect(effectiveKernel(3, 2)).toBe(5);
    expect(totalPad(3, "same", 2)).toBe(4);
    expect(totalPad(3, 2)).toBe(4);
  });
});

describe("transposedOutSize", () => {
  it("inverts a stride-2 conv up to the output padding", () => {
    const down = outSize(15, 3, 2, 1);
    expect(down).toBe(8);
    expect(transposedOutSize(down, 3, 2, 1, 1, 0)).toBe(15);
    expect(transposedOutSize(8, 3, 2, 1, 1, 1)).toBe(16);
  });
  it("rejects output padding that is not smaller than stride/dilation", () => expect(() => transposedOutSize(4, 3, 2, 1, 1, 2)).toThrow());
});

describe("parameters and MACs vs explicit loops", () => {
  it("counts weights and MACs the long way", () => {
    for (const [inC, outC, kh, kw, groups, bias] of [[3, 8, 3, 3, 1, true], [4, 8, 3, 5, 2, false], [6, 6, 3, 3, 6, true]] as const) {
      let weights = 0;
      for (let o = 0; o < outC; o++) for (let c = 0; c < inC / groups; c++) for (let i = 0; i < kh; i++) for (let j = 0; j < kw; j++) weights++;
      expect(convParams(inC, outC, [kh, kw], groups, bias)).toBe(weights + (bias ? outC : 0));
      const out = { c: outC, h: 5, w: 4 };
      let macs = 0;
      for (let o = 0; o < out.c; o++) for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) macs += (inC / groups) * kh * kw;
      expect(convMacs(out, inC, [kh, kw], groups)).toBe(macs);
    }
  });
  it("depthwise separable is far cheaper than a full conv", () => {
    const full = convParams(64, 128, [3, 3], 1, false);
    const sep = convParams(64, 64, [3, 3], 64, false) + convParams(64, 128, [1, 1], 1, false);
    expect(full).toBe(73728);
    expect(sep).toBe(8768);
  });
  it("rejects channels not divisible by groups", () => expect(() => convParams(5, 6, [3, 3], 2)).toThrow());
  it("a conv on a 16x16 glyph needs far fewer weights than a dense layer to the same output", () => {
    expect(convParams(1, 8, [3, 3])).toBe(80);
    expect(denseParams(16 * 16, 8 * 14 * 14)).toBe(256 * 1568 + 1568);
  });
});

/** Brute-force receptive field: trace which input pixels one output unit depends on in 1-D. */
function empiricalRf(layers: readonly ConvSpec[]): number {
  // Work backwards from output index 0 through each layer, ignoring padding (interior unit, large input).
  let lo = 1000;
  let hi = 1000;
  for (let i = layers.length - 1; i >= 0; i--) {
    const l = layers[i];
    const s = l.stride ?? (l.kind === "pool" ? l.k[0] : 1);
    const d = l.dilation ?? 1;
    lo = lo * s;
    hi = hi * s + d * (l.k[0] - 1);
  }
  return hi - lo + 1;
}

describe("summarize", () => {
  const stack: ConvSpec[] = [
    { kind: "conv", k: [3, 3], pad: 1, out: 8 },
    { kind: "pool", k: [2, 2] },
    { kind: "conv", k: [3, 3], pad: 1, out: 16 },
    { kind: "pool", k: [2, 2] },
    { kind: "conv", k: [3, 3], stride: 2, dilation: 2, pad: 2, out: 32 },
  ];
  const rep = summarize({ c: 1, h: 16, w: 16 }, stack);
  it("tracks shapes", () => {
    expect(rep.map((r) => [r.out.c, r.out.h, r.out.w])).toEqual([[8, 16, 16], [8, 8, 8], [16, 8, 8], [16, 4, 4], [32, 2, 2]]);
  });
  it("receptive field matches backward dependency tracing at every depth", () => {
    for (let n = 1; n <= stack.length; n++) expect(rep[n - 1].receptiveField).toBe(empiricalRf(stack.slice(0, n)));
  });
  it("known textbook values: three 3x3 convs see 7x7; jump grows with stride", () => {
    const r = summarize({ c: 1, h: 32, w: 32 }, [0, 1, 2].map(() => ({ kind: "conv", k: [3, 3], pad: 1, out: 4 }) as ConvSpec));
    expect(r[2].receptiveField).toBe(7);
    expect(rep[4].jump).toBe(8);
  });
  it("totals match per-layer arithmetic", () => {
    expect(rep[0].params).toBe(80);
    expect(rep[0].macs).toBe(8 * 16 * 16 * 1 * 9);
    expect(rep[1].params).toBe(0);
    const t = totals(rep);
    expect(t.params).toBe(80 + (8 * 9 + 1) * 16 + (16 * 9 + 1) * 32);
    expect(t.flops).toBe(2 * t.macs);
  });
  it("pool ceil mode rounds up", () => {
    const r = summarize({ c: 1, h: 7, w: 7 }, [{ kind: "pool", k: [2, 2], ceil: true }]);
    expect(r[0].out.h).toBe(4);
    expect(summarize({ c: 1, h: 7, w: 7 }, [{ kind: "pool", k: [2, 2] }])[0].out.h).toBe(3);
  });
});
