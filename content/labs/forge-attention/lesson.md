# Forge 12: scaled dot-product and multi-head attention

Attention answers one question for every token: **which other tokens should I read, and how much?** You build the whole mechanism, forward and backward.

## Queries, keys, values

Each token is projected three ways. A **query** says what it is looking for, a **key** says what it offers, a **value** is what it hands over when chosen. The score between token `i` and token `j` is the dot product `q_i · k_j`; a softmax over `j` turns each row of scores into weights that sum to 1; the output for `i` is the weighted average of the values:

`out = softmax(Q Kᵀ / √d) V`

## Why divide by √d?

If the entries of `q` and `k` have variance 1, their dot product has variance `d`. For `d = 64` the scores have a standard deviation of 8, and a softmax on numbers that spread is almost one-hot: one key takes everything, and the gradient through the saturated softmax is nearly zero. Dividing by `√d` brings the variance back to 1. Dividing by `d` instead over-corrects and makes attention too flat. The tests pin the exact divisor.

## Masks

A **causal mask** forbids token `i` from reading any `j > i`, which is what lets a language model train on every position at once without cheating. Implement it by setting forbidden scores to `-inf` **before** the softmax. Zeroing the weights afterwards leaves rows that no longer sum to 1, and setting scores to 0 still gives them weight `e⁰`. A **padding mask** works the same way for batch positions that hold no real token.

Numerics: subtract the row max before `exp`, otherwise a score near 1000 overflows. A row where *everything* is forbidden would compute `-inf − -inf = NaN`; this lab defines it as a row of zeros.

## Backward

Walk the graph in reverse. With `A = softmax(S)`, `S = Q Kᵀ/√d`, `out = A V`:

- `dV = Aᵀ dout`, `dA = dout Vᵀ`
- softmax Jacobian-vector product, row by row: `dS = A ⊙ (dA − Σⱼ dA ⊙ A)`
- `dQ = dS K / √d`, `dK = dSᵀ Q / √d`

Masked entries have `A = 0`, so they get exactly zero gradient with no special casing. You will check every one of these with finite differences.

## Multi-head attention

One attention can only mix values one way at a time. **Heads** split `d_model` into `h` blocks of `d_head = d_model / h`, run independent attentions on each block, and concatenate. An output matrix `Wo` then mixes the heads. In code a head is a reshape and a transpose, not a loop: `(N, T, d) → (N, T, h, d_head) → (N, h, T, d_head)`. Per-head scaling uses `√d_head`, not `√d_model`.

Cost to keep in mind: the weights matrix is `T × T` per head, so memory and compute grow with the **square** of the sequence length. That is the reason long contexts need tricks such as fused kernels and KV caches (later regions).

## Without positions, attention is a set function

Shuffle the tokens (no mask) and you get the same outputs, shuffled. A test proves it. That is why the previous Forge module added positions to the embeddings, and why the causal mask is the only thing in this lab that breaks the symmetry.

## Honest limits

This is single-sequence full attention with no biases, no dropout and no KV cache. Production models use fused kernels, grouped-query or multi-query variants to shrink the KV cache, and other position schemes. The mathematics you implement here is the core they all share.
