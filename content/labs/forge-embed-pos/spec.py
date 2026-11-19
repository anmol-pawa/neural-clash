"""Starter file shown to the player."""
import numpy as np


class Embedding:
    """Lookup table: integer token ids (N, T) -> vectors (N, T, dim)."""

    def __init__(self, vocab, dim, seed=0):
        """rng = np.random.default_rng(seed); W = rng.normal(size=(vocab, dim)) / sqrt(dim); dW = zeros."""
        raise NotImplementedError

    def forward(self, ids):
        """Return W[ids]. Remember ids for backward."""
        raise NotImplementedError

    def backward(self, dout):
        """dout (N, T, dim). SET dW (vocab, dim): row v is the SUM of dout at every position where id == v.
        Embedding has no input gradient (ids are integers), so return None."""
        raise NotImplementedError

    def params(self):
        return [self.W]

    def grads(self):
        return [self.dW]


def sinusoidal_pe(n, d, base=10000.0):
    """(n, d) table, d even. PE[pos, 2i] = sin(pos / base**(2i/d)), PE[pos, 2i+1] = cos(pos / base**(2i/d))."""
    raise NotImplementedError


def rope(x, base=10000.0, inverse=False):
    """Rotary position embedding on x (N, T, D), D even. Position t = index along axis 1.
    Each consecutive pair (x[..., 2i], x[..., 2i+1]) is rotated by the angle t * base**(-2i/D).
    inverse=True rotates the other way (that is also the backward pass of rope: a rotation's transpose is its inverse)."""
    raise NotImplementedError
