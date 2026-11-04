# Forge 1: a scalar autodiff `Value`

Every deep-learning framework is, at its core, this class. A `Value` wraps one float, remembers the operation and the inputs that produced it, and can run **reverse-mode automatic differentiation**: one backward sweep gives the derivative of the final output with respect to *every* input.

Why reverse mode? A network has millions of inputs (parameters) and one scalar output (the loss). Reverse mode costs about one extra forward pass for all gradients; forward mode would cost one pass per parameter.

## What to build

`Value(data, _children=(), _op="")` with attributes `data`, `grad` (starts at `0.0`), `_prev` (a set of child Values) and `_op`.

Operations, each returning a new `Value`, with Python numbers allowed on either side (`2 * v`, `v + 1`, `1 / v`):

- `+`, `-`, unary `-`, `*`, `/`, `** k` for an int or float `k`
- `tanh()`, `relu()`, `exp()`, `log()`

and `backward()`:

1. topologically sort the graph reachable from `self`;
2. set `self.grad = 1.0`;
3. walk the order in reverse, calling each node's `_backward`.

## The three things that bite

- **Accumulate.** `y = x * x` uses `x` twice, so `x.grad` is the *sum* of both paths: `+=`, not `=`.
- **Order.** A node's gradient must be complete before it is pushed to its inputs. That is what the topological order guarantees; a plain recursive walk fails on diamonds (`a -> b, a -> c, b + c`).
- **Local derivative times upstream gradient.** The chain rule is `child.grad += local_derivative * out.grad`.

**Interview signal:** "implement micrograd" is a common applied-ML screen. Explain the cost argument for reverse mode and why gradients are accumulated, and validate yourself with a finite-difference check.
