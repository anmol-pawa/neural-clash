# Forge 10: `RNN` and `GRUCell`

A feed-forward net reads a fixed-size input. A **recurrent** net reads a sequence one step at a time and carries a hidden state `h` forward, so the same weights are reused at every step. You will write the forward pass, **backpropagation through time (BPTT)** and a **GRU** step by hand, and prove both with finite differences.

## What to build

`RNN(in_dim, hidden, out_dim, seed=0)` on sequences shaped `(N, T, D)`; the output is read from the **last** hidden state (many-to-one, enough for "is this bracket string balanced?").

- `h_0 = 0`, `h_t = tanh(x_t @ Wxh + h_{t-1} @ Whh + bh)`, `logits = h_T @ Why + by`, shape `(N, C)`.
- Each call to `forward` starts from a fresh zero state. A state that leaks from the previous call is a real bug in stateful serving code.
- `backward(dlogits)` **sets** `dWxh, dWhh, dbh, dWhy, dby` and returns `dx` shaped like the input.

`GRUCell(in_dim, hidden, seed=0)`, one step on `(N, D)` and `(N, H)`, with gates packed `[z | r | n]`:

- `z = sigmoid(...)` (update), `r = sigmoid(...)` (reset), `n = tanh(x Wx_n + r * (h Wh_n) + b_n)`, `h' = (1 - z) * n + z * h`.
- `backward(dh_new)` sets `dWx, dWh, db` and returns `(dx, dh)`.

This is the convention used by common frameworks (reset applied after the `h` matmul). Papers sometimes write `(r * h) Wh_n` instead; both are valid GRUs, so always check which one a library uses.

## BPTT is the chain rule on an unrolled graph

Unroll the loop and you have a deep network of `T` layers that all share `Whh`. Walking back from the last step:

1. `da = dh * (1 - h_t**2)`: the gradient at the pre-activation (`tanh' = 1 - tanh²`).
2. Because the weights are shared, every step **adds** into `dWxh`, `dWhh` and `dbh`. Assigning instead of adding keeps only one step's contribution.
3. `dh = da @ Whh.T` is passed to step `t-1`, and `dx_t = da @ Wxh.T` is the gradient for this step's input.

Vectorise across the batch, not across time: time is inherently sequential, the loop over `t` stays.

## Why long sequences are hard

Look at step 3. Going back `k` steps multiplies the gradient by `Whh.T` and by a `tanh'` factor (at most 1) `k` times. If `Whh` has gain below 1 the gradient shrinks like `gain^k` (**vanishing**); above 1 it can blow up (**exploding**). The hidden test sets `Whh = 0.3·I` and shows the gradient 11 steps back is below one ten-thousandth of the last step's. The first-token-recall task in the Runes dataset is built to expose exactly this.

## The GRU's fix: a gated shortcut

When `z` is close to 1 the step is `h' ≈ h`, so `dh ≈ dh'` flows back **unchanged**. The cell can learn to keep memory for many steps without the gradient decaying. Your backward pass has two routes into `dh`: the direct `dh' * z`, and the one through the gates and candidate. Forgetting the direct route is the classic GRU bug and a test pins it.

The reset gate `r` only appears in the candidate. Where `r` is near 0 the candidate ignores the old state, so the cell can start a fresh thought mid-sequence.

## Honest limits

Gating helps but does not remove all trouble: gradients can still explode (clip the global norm), and for long contexts attention (next region) wins because every position connects to every other directly. RNNs remain the right tool when memory must stay constant per step, for example streaming inference on a device.

**Interview signal:** "derive BPTT for a vanilla RNN", "why do RNNs have vanishing gradients and how do LSTM/GRU help" and "truncated BPTT: what do you give up?" are standard ML-engineer questions. A strong answer names the repeated `Whh` product, the `+=` over shared weights, and the identity-like path through the update gate.
