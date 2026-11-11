"""Starter file shown to the player."""
import numpy as np


class Linear:
    """y = x @ W + b for inputs of shape (..., in_dim); W is (in_dim, out_dim), b is (out_dim,)."""

    def __init__(self, in_dim, out_dim, seed=0):
        """W ~ Normal(0, 1/in_dim) drawn from np.random.default_rng(seed); b = zeros. Also create dW, db."""
        raise NotImplementedError

    def forward(self, x):
        """Return x @ W + b and remember whatever backward will need."""
        raise NotImplementedError

    def backward(self, dout):
        """Given dLoss/dy (same shape as the output), SET self.dW and self.db and return dLoss/dx."""
        raise NotImplementedError

    def params(self):
        return [self.W, self.b]

    def grads(self):
        return [self.dW, self.db]
