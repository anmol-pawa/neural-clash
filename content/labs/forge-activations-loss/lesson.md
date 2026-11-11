# Forge 4: activations and stable losses

A network is linear layers separated by nonlinearities and ended by a loss. This module writes both halves as small objects with `forward` and `backward`, and the point is **numerical hygiene**: formulas that are correct on paper can still return `nan` on real logits.

## Activations: cache the cheapest thing

- **ReLU**: `max(x, 0)`; the gradient is the mask `x > 0` (zero at exactly 0, a convention that rarely matters). Cache the mask.
- **Tanh**: `d tanh = 1 - y²`. Cache the output `y`.
- **Sigmoid**: `d σ = y (1 - y)`. Cache `y`; compute it with `exp(-|x|)` so the exponent is never positive and nothing overflows.

Expressing the derivative through the *output* is not a trick: it is why these activations are cheap in backprop, and also why a saturated unit (`y` near 0 or 1, `|y|` near 1 for tanh) passes almost no gradient: the vanishing-gradient story in one line.

## Softmax cross-entropy: the most important gradient in ML

With logits `z` and target class `t`, `L = -log softmax(z)_t`. Its gradient is remarkably simple:

`dL/dz_j = p_j - [j = t]`

Averaged over a batch of `N`, divide by `N`. Two stability rules make it production-grade:

1. **Shift by the row max**. `softmax(z) = softmax(z - c)`, so subtracting `max(z)` keeps every exponent ≤ 0.
2. **Work in log space**. `log p = shifted - log Σ exp(shifted)`. Computing `log(softmax(z))` loses precision (and returns `-inf` when a probability underflows to 0).

## MSE and BCE

`mse_loss` averages over **all elements**, so the gradient is `2 (p - t) / size`. `bce_with_logits` takes *logits*, not probabilities, and uses `max(z, 0) - z y + log(1 + e^{-|z|})`, which is exact for every `z`. This is why frameworks expose `BCEWithLogitsLoss` and warn against `Sigmoid` followed by `BCELoss`.

## Verify like a professional

The hidden tests check every gradient by central differences, feed logits of ±1000 with overflow, invalid and divide-by-zero floating-point errors turned into failures, and assert shift invariance.

**Interview signal:** "derive the gradient of softmax cross-entropy" and "why subtract the max" are standard ML screens. A strong answer gives `p - y`, explains the `1/N`, and names log-sum-exp.
