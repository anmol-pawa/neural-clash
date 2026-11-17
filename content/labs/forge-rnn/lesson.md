# Forge 10: `RNN` and `GRUCell`

A feed-forward net sees a fixed-size input. A **recurrent** net reads a sequence one step at a time and carries a hidden state `h` forward: the state is its memory. You will write the layer, **backpropagation through time (BPTT)** and a gated cell, and prove them with finite differences.

## What to build

`RNN(in_dim, hidden, seed=0)` on sequences shaped `(N, T, D)`.

- `h_t = tanh(x_t @ Wxh + h_{t-1} @ Whh + bh)`, with `h_0 = 0` on every call.
- `forward(xs)` returns every state, shape `(N, T, hidden)`. A many-to-one classifier just reads the last one.
- `backward(dhs)` receives `dLoss/dh_t` for every step (zeros where a step has no loss of its own), **sets** `dWxh`, `dWhh`, `dbh` and returns `dxs`.

`GRUCell(in_dim, hidden, seed=0)` is one gated step with gates packed as `[z | r | n]`.

## Unrolling is the whole idea

Unroll the loop and the net is an ordinary deep network with `T` layers that **share weights**. Everything you know applies, with one new rule: a shared parameter gets the **sum** of its gradient from every step.

Backward walks time in reverse, carrying `dh_next`, the gradient arriving from the future:

1. `dh = dhs[:, t] + dh_next`: this step's own loss plus everything downstream.
2. `da = dh * (1 - h_t²)`: through tanh.
3. `dWxh += x_tᵀ @ da`, `dWhh += h_{t-1}ᵀ @ da` (the **previous** state: that is the one `Whh` multiplied), `dbh += da.sum(0)`.
4. `dx_t = da @ Wxhᵀ` and `dh_next = da @ Whhᵀ`.

The classic bugs: forgetting to carry `dh_next` (truncated BPTT by accident), pairing `dWhh` with `h_t`, and assigning instead of adding across time.

## Why long memory is hard

Look at step 4. To reach `k` steps into the past, the gradient is multiplied by `Whhᵀ` and by the tanh slope `k` times. If that product shrinks the gradient it **vanishes**; if it grows it **explodes**. The solver in the Rapids shows the curve: the gradient from the last step decays geometrically with distance, so early tokens barely teach the network anything. Clipping the gradient norm tames explosions; it cannot bring back a vanished signal.

## The GRU: a shortcut for the gradient

`z = σ(x Wz + h Uz + bz)`, `r = σ(x Wr + h Ur + br)`, `n = tanh(x Wn + r * (h Un) + bn)`, `h' = (1 - z) * n + z * h`.

When `z` is near 1 the state is **copied**: `h' ≈ h`. The backward pass has a direct term `dh' * z` that skips the tanh and the matmul entirely, so the gradient survives many steps. That additive path is the same idea as the LSTM's cell state and as a ResNet's skip connection. The reset gate `r` decides how much of the old state feeds the candidate; here it scales `h @ Un` **after** the matmul (the variant most frameworks use; another published variant resets before it, giving a different cell).

Work backward from the end: `dn = dh' (1 - z)`, `dz = dh' (h - n)`, then the tanh and sigmoid slopes. The candidate's recurrent term is `r * q` with `q = h @ Un`, so `r` receives `dan * q` and the matmul receives `dan * r`.

## Honest costs

An RNN is sequential in time: step `t` needs step `t-1`, so training cannot be parallelised across the sequence the way attention can. That bottleneck (and the fixed-size state that must squeeze the whole past) is what the transformer later attacks.

**Interview signal:** "derive BPTT", "why do RNNs have vanishing gradients" and "what does the GRU/LSTM gate fix" are standard ML-engineer questions. A strong answer names the repeated `Whh` multiplication, the shared-weight sum, and the additive gradient path.
