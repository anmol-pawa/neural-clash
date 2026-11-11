/**
 * CNN layer-stack solvers: output shapes, receptive field, parameters and multiply-accumulates.
 * Pure functions; used by lesson cards and checked against brute-force simulation in tests.
 */
import { convOut } from "./shapes";

export interface ConvLayer {
  kind: "conv" | "pool";
  kernel: number;
  stride?: number;
  pad?: number;
  dilation?: number;
  /** Output channels (conv only). Pool keeps the channel count. */
  out?: number;
}

export interface LayerReport {
  h: number;
  w: number;
  c: number;
  /** Receptive field (pixels along one axis) of one output unit, in input coordinates. */
  rf: number;
  /** Cumulative stride ("jump") between adjacent output units, in input pixels. */
  jump: number;
  params: number;
  macs: number;
}

/** Parameters of a conv layer: weights O*C*k*k plus optional bias O. */
export function convParams(inC: number, outC: number, k: number, bias = true): number {
  return outC * inC * k * k + (bias ? outC : 0);
}

/** Multiply-accumulates of one conv forward pass for one image: O * H' * W' * C * k * k. */
export function convMacs(inC: number, outC: number, k: number, outH: number, outW: number): number {
  return outC * outH * outW * inC * k * k;
}

/** Walk a square-kernel stack on an (h, w, c) input and report every layer. */
export function analyzeStack(h: number, w: number, c: number, layers: readonly ConvLayer[]): LayerReport[] {
  const reports: LayerReport[] = [];
  let rf = 1;
  let jump = 1;
  for (const l of layers) {
    const s = l.stride ?? (l.kind === "pool" ? l.kernel : 1);
    const p = l.pad ?? 0;
    const d = l.dilation ?? 1;
    const nh = convOut(h, l.kernel, s, p, d);
    const nw = convOut(w, l.kernel, s, p, d);
    const effK = d * (l.kernel - 1) + 1;
    rf += (effK - 1) * jump;
    jump *= s;
    let params = 0;
    let macs = 0;
    let nc = c;
    if (l.kind === "conv") {
      nc = l.out ?? c;
      params = convParams(c, nc, l.kernel);
      macs = convMacs(c, nc, l.kernel, nh, nw);
    }
    [h, w, c] = [nh, nw, nc];
    reports.push({ h, w, c, rf, jump, params, macs });
  }
  return reports;
}

/** Dense layer cost for comparison: in*out weights + out biases; MACs = in*out. */
export function denseCost(inUnits: number, outUnits: number): { params: number; macs: number } {
  return { params: inUnits * outUnits + outUnits, macs: inUnits * outUnits };
}
