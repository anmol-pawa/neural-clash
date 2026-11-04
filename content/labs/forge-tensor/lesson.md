# Forge 2: a numpy `Tensor`

Forge 1 differentiated single numbers. Real networks push whole arrays through the graph, so now every node holds an `ndarray`, and `grad` has **the same shape as `data`**. That invariant is the single best debugging tool you have.

## What to build

`Tensor(data, _children=(), _op="")` with `data` (float64 array), `grad` (zeros of the same shape), `_prev`, `_op`, and:

- `+`, `-`, unary `-`, `*`, `/`, `** k` (plain number `k`), numbers or arrays on either side
- `@` (matrix product of 2-D tensors), `.T`
- `sum(axis=None, keepdims=False)`, `mean(...)`
- `tanh()`, `relu()`, `exp()`, `log()`
- `backward()`: seeds `grad` with ones, then runs each node's `_backward` in reverse topological order
- `unbroadcast(grad, shape)`: the helper that makes broadcasting differentiable

## Broadcasting, reversed

Adding a bias of shape `(3,)` to activations of shape `(5, 3)` *copies* the bias to five rows in the forward pass. In the backward pass the five rows' gradients all belong to the one bias, so they **add up**:

- extra leading axes are summed away (`sum(axis=0)` until the rank matches);
- axes where the operand had size 1 are summed with `keepdims=True`.

Every elementwise op must call `unbroadcast` for each operand. Forget it and a bias update has the wrong shape, or, worse, silently the wrong value.

## Matmul and reductions

For `C = A @ B`: `dA = dC @ B.T` and `dB = A.T @ dC`. You can re-derive these by checking shapes: `dA` must be `(n, k)` and `dC @ B.T` is `(n, m) @ (m, k)`.

`sum` copies each upstream gradient to every element it summed: `expand_dims` the reduced axis back (unless `keepdims`) and `broadcast_to` the input shape. `mean` is a `sum` scaled by `1 / count`, where `count` is the number of elements *averaged*, not the number of rows.

## Verify like a professional

Run a finite-difference gradient check on any new op before trusting it. The hidden tests do exactly that on linear layers, softmax cross-entropy and diamond graphs.

**Interview signal:** "implement a tiny autograd on tensors" appears in applied-ML and ML-infra screens. Strong answers state the shape invariant, explain why bias gradients are sums, and name the check they would run.
