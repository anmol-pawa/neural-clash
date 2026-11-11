# Forge 7: dropout, momentum, AdamW and weight decay

Three tools that shape *how* a network trains and how much it overfits.

## Dropout

During training, zero each unit with probability `p` and multiply the survivors by `1/(1−p)`. This is **inverted dropout**: the expected activation is unchanged, so evaluation just runs the network as is.

- A fresh mask every forward call. A mask frozen at construction is a different (and much weaker) regulariser.
- Backward must reuse the *same* mask: `dx = dout ⊙ mask`.
- Evaluation mode is the identity. Forgetting `eval()` is a classic "my accuracy is noisy at test time" bug.
- `p` is the **drop** probability. PyTorch uses the same meaning; some older papers define it as keep probability, so state yours.

## SGD with momentum

`v = μ·v + g`, `p −= lr·v`. The velocity averages recent gradients, so steady directions speed up and zig-zag directions cancel. On an ill-conditioned bowl, momentum reaches the minimum in a fraction of the steps.

With **L2 weight decay** the gradient becomes `g + λ·p`: the penalty `λ/2·‖p‖²` pulls every weight toward zero.

## AdamW

Adam divides the step by a running estimate of gradient magnitude: `p −= lr · m̂ / (√v̂ + ε)`.

- **Bias correction.** `m` and `v` start at zero, so early estimates are too small. Dividing by `1−βᵗ` fixes that. Without it the first step is about 3× too large.
- **ε sits outside the square root** in the standard form; it protects the division when `v̂` is tiny.
- **Decoupled decay.** Putting `λ·p` into the gradient (L2) makes Adam *normalise it away*: large weights get the same-size step as small ones. AdamW instead shrinks the weights directly, `p ← p·(1 − lr·λ)`, independent of the moments. This is why AdamW is the default for transformers.

## Verify like a professional

Test the first Adam step (it must be ≈ `lr·sign(g)`), test that a zero gradient plus decay shrinks weights by exactly `1 − lr·λ`, and check that scaling the gradient by 1000 barely changes the update (Adam's scale invariance).

**Interview signal:** "what is the difference between L2 regularisation and weight decay in Adam?" and "why is dropout scaled?" come up constantly. A strong answer gives the formula and the consequence (decay interacts with the adaptive denominator; scaling keeps the expectation).
