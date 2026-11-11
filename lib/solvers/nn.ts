// Pure helpers for Neuron Nest (CUR F7). They cross-check the numpy-computed deck answers (tests/nn.test.ts) and
// the backprop derivation by finite differences, independently of the Python used to generate the cards.

export const sigmoid = (z: number): number => 1 / (1 + Math.exp(-z));
export const sigmoidGrad = (z: number): number => { const s = sigmoid(z); return s * (1 - s); };
export const relu = (z: number): number => Math.max(0, z);

export function softmax(z: number[]): number[] {
  const m = Math.max(...z);
  const e = z.map((v) => Math.exp(v - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
}
export const crossEntropy = (logits: number[], target: number): number => -Math.log(softmax(logits)[target]);
/** d(cross-entropy)/d(logits) = p - onehot. */
export function logitsGrad(logits: number[], target: number): number[] {
  return softmax(logits).map((p, i) => p - (i === target ? 1 : 0));
}

/** Parameters of a dense MLP: fan_in x fan_out weights plus one bias per output. */
export function mlpParams(sizes: number[]): number { return sizes.slice(1).reduce((s, out, i) => s + sizes[i] * out + out, 0); }
/** Multiply-adds in one forward pass for one example (biases and activations ignored). */
export function mlpMacs(sizes: number[]): number { return sizes.slice(1).reduce((s, out, i) => s + sizes[i] * out, 0); }
export const xavierVariance = (fanIn: number, fanOut: number): number => 2 / (fanIn + fanOut);
export const heVariance = (fanIn: number): number => 2 / fanIn;

/** A two-layer net y = relu(x W1) . w2 with squared-error loss, analytic forward and backward. */
export interface TwoLayer { x: number[]; W1: number[][]; w2: number[]; t: number }
export function twoLayerForward(n: TwoLayer): { z: number[]; h: number[]; y: number; loss: number } {
  const z = n.W1[0].map((_, j) => n.x.reduce((s, xi, i) => s + xi * n.W1[i][j], 0));
  const h = z.map(relu);
  const y = h.reduce((s, hj, j) => s + hj * n.w2[j], 0);
  return { z, h, y, loss: 0.5 * (y - n.t) ** 2 };
}
export function twoLayerBackward(n: TwoLayer): { dw2: number[]; dW1: number[][] } {
  const { z, h, y } = twoLayerForward(n);
  const dy = y - n.t;
  const dz = z.map((zj, j) => (zj > 0 ? dy * n.w2[j] : 0));
  return { dw2: h.map((hj) => dy * hj), dW1: n.x.map((xi) => dz.map((d) => xi * d)) };
}

/** Central finite difference of a scalar function of one coordinate. */
export function centralDifference(f: (v: number) => number, v: number, eps = 1e-6): number { return (f(v + eps) - f(v - eps)) / (2 * eps); }
