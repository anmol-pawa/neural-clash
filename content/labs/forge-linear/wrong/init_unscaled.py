import numpy as np


class Linear:
    def __init__(self, in_dim, out_dim, seed=0):
        rng = np.random.default_rng(seed)
        self.W = rng.normal(size=(in_dim, out_dim))
        self.b = np.zeros(out_dim)
        self.dW = np.zeros_like(self.W)
        self.db = np.zeros_like(self.b)
        self._x = None

    def forward(self, x):
        x = np.asarray(x, dtype=float)
        self._x = x.copy()  # the caller may reuse its buffer
        return x @ self.W + self.b

    def backward(self, dout):
        dout = np.asarray(dout, dtype=float)
        # Collapse every leading (batch-like) axis so a single matmul sums over all examples.
        x2 = self._x.reshape(-1, self._x.shape[-1])
        d2 = dout.reshape(-1, dout.shape[-1])
        self.dW = x2.T @ d2
        self.db = d2.sum(axis=0)
        return dout @ self.W.T

    def params(self):
        return [self.W, self.b]

    def grads(self):
        return [self.dW, self.db]
