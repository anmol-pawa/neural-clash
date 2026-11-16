# Forge 10: an `RNN` with BPTT, and a `GRUCell`

A feed-forward net sees a fixed-size input. A **recurrent** net reads a sequence one symbol at a time and carries a **hidden state** `h` along: a running summary of everything seen so far. The same weights are used at every step. That one fact explains both why RNNs are compact and why they are hard to train.

## What to build

`RNN(in_dim, hidden, out_dim, seed=0)` on sequences shaped `(N, T, D)`, with row-vector maths like the rest of the Forge.

- `h_0 = 0`, `h_t = tanh(x_t @ Wx + h_{t-1} @ Wh + bh)`, `logits = h_T @ Wy + by` (many-to-one: read the whole sequence, then answer).
- `backward(dlogits)` **sets** `dWx, dWh, dbh, dWy, dby`, returns `dx` of shape `(N, T, D)`, and fills `dh_norms`.

`GRUCell(in_dim, hidden, seed=0)` is one step of a gated recurrent unit:

```
z  = sigmoid(x @ Wz + h @ Uz + bz)      update gate
r  = sigmoid(x @ Wr + h @ Ur + br)      reset gate
n  = tanh(x @ Wn + (r * h) @ Un + bn)   candidate state
h' = (1 - z) * n + z * h
```

`backward(dh_new)` sets nine parameter gradients and returns `(dx, dh)`.

## Backpropagation through time

BPTT is ordinary backprop on the **unrolled** graph: copy the cell `T` times, share the weights, and run the chain rule backwards. Two facts do all the work.

1. **The gradient of a shared weight is the sum over its uses.** `dWh = sum_t h_{t-1}.T @ da_t`. Assigning instead of adding keeps only one step; stopping early is *truncated* BPTT, a deliberate approximation that you did not intend here.
2. **The state gradient is pushed back through `tanh` and `Wh`.** With `da_t = dh_t * (1 - h_t**2)`, the previous state receives `dh_{t-1} = da_t @ Wh.T`. Note the transpose, and note the tanh derivative uses the state *after* the step, `h_t`, not `h_{t-1}`.

## Why gradients vanish or explode

Follow one gradient back `k` steps and it is multiplied by `k` copies of `Wh.T` and `k` tanh slopes (each at most 1). If the recurrent map shrinks vectors (singular values below 1) the product shrinks geometrically: the loss at step `T` barely hears about step `T-k`, so the net cannot learn long-range dependencies. If it expands them (above 1) the product blows up, which is the classic reason for gradient clipping. `dh_norms[t]` lets you see it: with `Wh = 0.5 I` it halves per step, with `1.5 I` it grows by half. Your tests use exactly that.

## What gates buy you

Look at `h' = (1 - z) * n + z * h`. When `z` is near 1 the cell **copies** its state, and the gradient passes through `dh = dh' * z` untouched: an identity path through time, so nothing vanishes. When `z` is near 0 the cell overwrites its state with a fresh candidate. The reset gate `r` decides how much of the old state the candidate may read. An LSTM does the same with a separate cell state and a forget gate.

Honest caveats: this reset-before-matmul form is one of two conventions in use (some libraries apply `r` after the matmul); both are valid, so your grader fixes one. Gates make long memory *possible*, not guaranteed, and the transformers you build later mostly replaced recurrence because attention reaches any step directly.

## Pitfalls the tests probe

- state kept between calls (every `forward` must start from `h_0 = 0`);
- `dWh` from the last step only, or `+=` replaced with `=`;
- `da @ Wh` without the transpose (hides when `Wh` is symmetric, so tests use random `Wh`);
- tanh slope taken at the wrong time step;
- a sigmoid that overflows for large negative inputs.

**Interview signal:** "explain vanishing gradients in RNNs" and "derive the GRU/LSTM backward pass" are standard ML-engineer questions. A strong answer names the repeated product of Jacobians, shows the identity path through the update gate or the cell state, and mentions clipping for the exploding side.
