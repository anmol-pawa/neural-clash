import numpy as np


class Embedding:
    def __init__(self, vocab, dim, seed=0):
        rng = np.random.default_rng(seed)
        self.W = rng.normal(size=(vocab, dim)) / np.sqrt(dim)
        self.dW = np.zeros_like(self.W)
        self._ids = None

    def forward(self, ids):
        ids = np.asarray(ids)
        self._ids = ids
        return self.W[ids]

    def backward(self, dout):
        dout = np.asarray(dout, dtype=float)
        self.dW = np.zeros_like(self.W)
        np.add.at(self.dW, self._ids, dout)  # unbuffered scatter-add: repeated ids accumulate
        return None

    def params(self):
        return [self.W]

    def grads(self):
        return [self.dW]


def sinusoidal_pe(n, d, base=10000.0):
    d -= d % 2  # BUG: rounds an odd width down instead of rejecting it
    pos = np.arange(n)[:, None]
    i = np.arange(d // 2)[None, :]
    angle = pos / base ** (2 * i / d)
    pe = np.zeros((n, d))
    pe[:, 0::2] = np.sin(angle)
    pe[:, 1::2] = np.cos(angle)
    return pe


def rope(x, base=10000.0, inverse=False):
    x = np.asarray(x, dtype=float)
    _, T, D = x.shape
    if D % 2 != 0:
        raise ValueError("D must be even")
    angle = np.arange(T)[:, None] * base ** (-2 * np.arange(D // 2)[None, :] / D)  # (T, D/2)
    c, s = np.cos(angle), np.sin(angle)
    if inverse:
        s = -s
    a, b = x[..., 0::2], x[..., 1::2]
    out = np.empty_like(x)
    out[..., 0::2] = a * c - b * s
    out[..., 1::2] = a * s + b * c
    return out
