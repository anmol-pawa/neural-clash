"""Starter file shown to the player."""
import math


class Value:
    def __init__(self, data, _children=(), _op=""):
        """Hold a float, its gradient (0.0), the child set and the op name."""
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

    def tanh(self):
        raise NotImplementedError

    def relu(self):
        raise NotImplementedError

    def exp(self):
        raise NotImplementedError

    def log(self):
        raise NotImplementedError

    def backward(self):
        """Fill .grad of every node reachable from self with d(self)/d(node)."""
        raise NotImplementedError
