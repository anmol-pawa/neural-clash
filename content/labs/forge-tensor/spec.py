"""Starter file shown to the player."""
import numpy as np


def unbroadcast(grad, shape):
    """Sum `grad` down to `shape`: undo numpy's broadcasting in the backward pass."""
    raise NotImplementedError


class Tensor:
    def __init__(self, data, _children=(), _op=""):
        """Hold a float64 ndarray `data`, a zero `grad` of the same shape, the child set and op name."""
        raise NotImplementedError

    @property
    def shape(self):
        return self.data.shape

    @property
    def T(self):
        raise NotImplementedError

    def __add__(self, other):
        raise NotImplementedError

    def __mul__(self, other):
        raise NotImplementedError

    def __pow__(self, k):
        raise NotImplementedError

    def __neg__(self):
        raise NotImplementedError

    def __sub__(self, other):
        raise NotImplementedError

    def __truediv__(self, other):
        raise NotImplementedError

    def __radd__(self, other):
        return self + other

    def __rmul__(self, other):
        return self * other

    def __rsub__(self, other):
        return (-self) + other

    def __rtruediv__(self, other):
        return (self ** -1) * other

    def __matmul__(self, other):
        raise NotImplementedError

    def sum(self, axis=None, keepdims=False):
        raise NotImplementedError

    def mean(self, axis=None, keepdims=False):
        raise NotImplementedError

    def tanh(self):
        raise NotImplementedError

    def relu(self):
        raise NotImplementedError

    def exp(self):
        raise NotImplementedError

    def log(self):
        raise NotImplementedError

    def backward(self):
        """Seed self.grad with ones and fill .grad of every node reachable from self."""
        raise NotImplementedError
