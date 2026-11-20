// Parameter and FLOP counting for pre-LN decoder blocks. Conventions match Forge 13 (`block_param_count`, `block_flops`):
// a multiply-add is 2 FLOPs, only matmuls are counted, attention has no biases, the FFN has biases, LayerNorm has gamma + beta.

export interface BlockShape {
  dModel: number;
  dFF: number;
}

/** Trainable parameters of one block. */
export function blockParams({ dModel: d, dFF: f }: BlockShape): number {
  return 4 * d * d + (2 * d * f + f + d) + 4 * d;
}

/** Forward matmul FLOPs of one block for one sequence of T tokens. */
export function blockFlops(T: number, { dModel: d, dFF: f }: BlockShape): number {
  return 8 * T * d * d + 4 * T * T * d + 4 * T * d * f;
}

/** Share of a block's matmul FLOPs spent on the T x T attention matmuls (the quadratic part). */
export function attentionFlopShare(T: number, shape: BlockShape): number {
  return (4 * T * T * shape.dModel) / blockFlops(T, shape);
}

/** Context length at which the quadratic attention matmuls equal the linear ones: 4 T^2 d = 8 T d^2 + 4 T d f. */
export function attentionCrossoverT({ dModel: d, dFF: f }: BlockShape): number {
  return (8 * d * d + 4 * d * f) / (4 * d);
}

/** Whole decoder-only model: token embedding, `layers` blocks, a final LayerNorm, and an LM head (tied = shares the embedding matrix). */
export function modelParams(opts: BlockShape & { vocab: number; layers: number; tied?: boolean }): number {
  const emb = opts.vocab * opts.dModel;
  return emb + opts.layers * blockParams(opts) + 2 * opts.dModel + (opts.tied ? 0 : emb);
}
