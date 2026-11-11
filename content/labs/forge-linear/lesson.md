# Forge 3: a `Linear` layer

Forge 2 built a general autograd engine. Real frameworks also ship **layers with hand-derived backward passes**, because the formulas are short and a fused kernel beats a graph of tiny ops. This module is that exercise for the layer you will use more than any other.

## What to build

`Linear(in_dim, out_dim, seed=0)` holding `W` of shape `(in_dim, out_dim)`, `b` of shape `(out_dim,)` and their gradients `dW`, `db`.

- `forward(x)` returns `x @ W + b` for `x` of shape `(..., in_dim)` and caches what backward needs.
- `backward(dout)` takes `dLoss/dy` (same shape as the output), **sets** `dW` and `db`, and returns `dLoss/dx`.
- Initialise `W ~ Normal(0, 1/in_dim)` from `np.random.default_rng(seed)` and `b = 0`.

## The three formulas, derived from shapes

For a batch `X` of shape `(n, in)` and `Y = X W + b`:

- `dW = Xᵀ dY`: shape `(in, n) @ (n, out) = (in, out)`. Each weight's gradient is a sum over examples of `input_i * upstream_j`.
- `db = dY` summed over the batch axis: the bias was *broadcast* to every row, so its gradient is the *sum* of the rows (the Forge 2 lesson again).
- `dX = dY Wᵀ`: shape `(n, out) @ (out, in) = (n, in)`.

Higher-rank inputs such as `(batch, time, features)` need no new maths: flatten every leading axis into one with `reshape(-1, features)`, apply the same lines, and return `dX` in the original shape.

## Two contract details that cause real bugs

- **No `1/n` inside the layer.** Averaging over the batch happens once, in the loss. Dividing again in the layer silently shrinks every gradient by the batch size, and training "works" but crawls.
- **Set, don't accumulate.** In this lab `backward` overwrites `dW` and `db`. (PyTorch accumulates into `.grad` and makes you call `zero_grad()`; that is a deliberate choice for gradient accumulation across micro-batches. Know which contract your code has.)

## Verify like a professional

The hidden tests perturb every entry of `x`, `W` and `b` and compare central differences with your analytic gradients. Do the same on any layer you ever write. A relative error around `1e-7` is a pass; `1e-2` is a bug.

**Interview signal:** "write the backward pass of a linear layer" is a classic ML-engineer screen. A strong answer states the shape argument first, says why `db` is a sum, and mentions the gradient check.
