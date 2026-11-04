import numpy as np


def unbroadcast(grad, shape):
    """Sum grad down to `shape`: undo numpy's broadcasting for the backward pass."""
    grad = np.asarray(grad, dtype=float)
    while grad.ndim > len(shape):
        grad = grad.sum(axis=0)
    for axis, size in enumerate(shape):
        if size == 1 and grad.shape[axis] != 1:
            grad = grad.sum(axis=axis, keepdims=True)
    return grad


class Tensor:
    def __init__(self, data, _children=(), _op=""):
        self.data = np.array(data, dtype=float)
        self.grad = np.zeros_like(self.data)
        self._prev = set(_children)
        self._op = _op
        self._backward = lambda: None

    @property
    def shape(self):
        return self.data.shape

    @property
    def T(self):
        out = Tensor(self.data.T, (self,), "T")

        def _backward():
            self.grad += out.grad.T

        out._backward = _backward
        return out

    def __repr__(self):
        return f"Tensor(shape={self.shape})"

    @staticmethod
    def _lift(x):
        return x if isinstance(x, Tensor) else Tensor(x)

    def __add__(self, other):
        other = Tensor._lift(other)
        out = Tensor(self.data + other.data, (self, other), "+")

        def _backward():
            self.grad += unbroadcast(out.grad, self.shape)
            other.grad += unbroadcast(out.grad, other.shape)

        out._backward = _backward
        return out

    def __mul__(self, other):
        other = Tensor._lift(other)
        out = Tensor(self.data * other.data, (self, other), "*")

        def _backward():
            self.grad += unbroadcast(other.data * out.grad, self.shape)
            other.grad += unbroadcast(self.data * out.grad, other.shape)

        out._backward = _backward
        return out

    def __pow__(self, k):
        assert isinstance(k, (int, float)), "exponent must be a plain number"
        out = Tensor(self.data ** k, (self,), f"**{k}")

        def _backward():
            self.grad += k * self.data ** (k - 1) * out.grad

        out._backward = _backward
        return out

    def __neg__(self):
        return self * -1.0

    def __sub__(self, other):
        return self + (-Tensor._lift(other))

    def __truediv__(self, other):
        return self * Tensor._lift(other) ** -1

    def __radd__(self, other):
        return self + other

    def __rmul__(self, other):
        return self * other

    def __rsub__(self, other):
        return (-self) + other

    def __rtruediv__(self, other):
        return (self ** -1) * other

    def __matmul__(self, other):
        other = Tensor._lift(other)
        out = Tensor(self.data @ other.data, (self, other), "@")

        def _backward():
            self.grad += out.grad @ other.data.T
            other.grad += self.data.T @ out.grad

        out._backward = _backward
        return out

    def sum(self, axis=None, keepdims=False):
        out = Tensor(self.data.sum(axis=axis, keepdims=keepdims), (self,), "sum")

        def _backward():
            g = out.grad
            if axis is not None and not keepdims:
                g = np.expand_dims(g, axis)
            self.grad += np.broadcast_to(g, self.shape)

        out._backward = _backward
        return out

    def mean(self, axis=None, keepdims=False):
        if axis is None:
            count = self.data.size
        else:
            axes = (axis,) if isinstance(axis, int) else tuple(axis)
            count = int(np.prod([self.shape[a] for a in axes]))
        return self.sum(axis=axis, keepdims=keepdims) * (1.0 / count)

    def tanh(self):
        t = np.tanh(self.data)
        out = Tensor(t, (self,), "tanh")

        def _backward():
            self.grad += (1.0 - t) * out.grad

        out._backward = _backward
        return out

    def relu(self):
        out = Tensor(np.maximum(self.data, 0.0), (self,), "relu")

        def _backward():
            self.grad += (self.data > 0) * out.grad

        out._backward = _backward
        return out

    def exp(self):
        e = np.exp(self.data)
        out = Tensor(e, (self,), "exp")

        def _backward():
            self.grad += e * out.grad

        out._backward = _backward
        return out

    def log(self):
        out = Tensor(np.log(self.data), (self,), "log")

        def _backward():
            self.grad += out.grad / self.data

        out._backward = _backward
        return out

    def backward(self):
        order, seen = [], set()
        stack = [(self, iter(self._prev))]
        seen.add(self)
        while stack:
            node, children = stack[-1]
            for child in children:
                if child not in seen:
                    seen.add(child)
                    stack.append((child, iter(child._prev)))
                    break
            else:
                order.append(node)
                stack.pop()
        self.grad = np.ones_like(self.data)
        for node in reversed(order):
            node._backward()
