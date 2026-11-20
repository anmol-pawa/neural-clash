# Forge 13: LayerNorm, GELU and the pre-LN transformer block

A transformer block is attention plus a small MLP, each wrapped in the same three-part pattern: **normalise, transform, add back**. You assemble it from parts you already own (attention from Forge 12 is provided) and build the rest: GELU, a batch-free LayerNorm, the feed-forward network and the block itself, with exact gradients.

## The block

`x1 = x + Attn(LN1(x))`  then  `out = x1 + FFN(LN2(x1))`

This is the **pre-LN** layout used by most modern decoder-only models: the LayerNorm sits *inside* the residual branch, so the stream `x → x1 → out` is only ever added to, never rescaled. Two consequences:

- **The residual stream is a highway.** With every sublayer output zeroed, `out == x` exactly, and in backward `dx == dout`. A test checks both. Gradients reach early layers without passing through any matmul or norm.
- **Training is easier to keep stable.** The original transformer used **post-LN** (`LN(x + sublayer(x))`), which renormalises the stream at each layer and typically needs a careful learning-rate warm-up to train deep stacks. Pre-LN tolerates larger learning rates, at some cost in final quality reported by some studies. Treat this as a trade-off, not a law.

## LayerNorm over features

Forge 8 normalised each *feature* across a batch. Transformers normalise each *token* across its features: statistics over the **last axis**, so a token's output never depends on other tokens (important for causal models) or on batch size (important for generation, where batches are tiny). `eps` keeps a constant token finite. Backward is the same formula as before with sums over the feature axis, and `dx` sums to zero over features because adding a constant to a token cannot change its normalised value.

## GELU

`gelu(x) = x · Φ(x)`, a smooth gate that lets small negatives through. You implement the common **tanh approximation**, `0.5 x (1 + tanh(√(2/π)(x + 0.044715 x³)))`. Its derivative needs the product rule *and* the chain rule through the cubic; each missing term is a documented wrong version. Another approximation, `x·σ(1.702x)`, is also in use; the tests pin the tanh form so results are reproducible.

## The feed-forward network

Applied to every token independently: `W2 · GELU(W1 x + b1) + b2`, with `d_ff` typically `4 · d_model` in classic models (many recent models use other ratios or gated variants). Most of a block's parameters live here.

## Counting parameters and FLOPs

Per block: attention `4d²` (no biases here), FFN `2·d·d_ff + d_ff + d`, two LayerNorms `4d`. With `d_ff = 4d` that is about `12 d²`. For FLOPs, count a multiply-add as 2 and only matmuls: projections `8Td²`, the two attention matmuls `4T²d`, the FFN `4·T·d·d_ff`. The `T²` term is the cost of attention growing with the square of context, while everything else is linear in `T`. A later region turns these into training-cost and memory estimates for real model sizes. Your tests check the formulas against the arrays actually allocated by your block.

## Honest limits

No dropout, no weight tying, no final norm, no embeddings and no output head yet. Real blocks often use RMSNorm, gated MLPs (SwiGLU), rotary positions and grouped-query attention; each changes the counts above, none changes the pattern.
