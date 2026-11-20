"""Starter file shown to the player."""
import numpy as np


def causal_mask(T):
    """(T, T) bool, True where query i may attend key j. A token sees itself and the past: j <= i."""
    raise NotImplementedError


def masked_softmax(scores, mask=None):
    """Softmax over the LAST axis. mask is broadcastable to scores, True = keep, False = forbidden (weight exactly 0).
    Must not overflow for huge scores, and a row with nothing allowed returns zeros (not NaN)."""
    raise NotImplementedError


def sdpa(Q, K, V, mask=None):
    """Scaled dot-product attention. Q, K, V have shape (..., T, d): any leading batch/head axes.
    scores = Q K^T / sqrt(d); A = masked_softmax(scores, mask); out = A V.
    Return (out, A)."""
    raise NotImplementedError


def sdpa_backward(dout, Q, K, V, A):
    """A is the weights sdpa returned. Return (dQ, dK, dV).
    dV = A^T dout;  dA = dout V^T;  dS = A * (dA - rowsum(dA * A));  dQ = dS K / sqrt(d);  dK = dS^T Q / sqrt(d)."""
    raise NotImplementedError


class MultiHeadAttention:
    """Self-attention with h heads. x (N, T, d_model) -> (N, T, d_model). No biases."""

    def __init__(self, d_model, n_heads, seed=0):
        """Raise ValueError unless d_model % n_heads == 0.
        rng = np.random.default_rng(seed); draw Wq, Wk, Wv, Wo in that order, each (d_model, d_model) ~ Normal(0,1)/sqrt(d_model).
        Create dWq, dWk, dWv, dWo too."""
        raise NotImplementedError

    def forward(self, x, causal=True):
        """q = x Wq etc., split into heads (N, h, T, d_head), run sdpa per head (causal_mask when causal),
        merge heads back to (N, T, d_model), then multiply by Wo. Keep the weights as self.attn with shape (N, h, T, T)."""
        raise NotImplementedError

    def backward(self, dout):
        """SET dWq, dWk, dWv, dWo (summed over the batch) and return dx (N, T, d_model)."""
        raise NotImplementedError

    def params(self):
        return [self.Wq, self.Wk, self.Wv, self.Wo]

    def grads(self):
        return [self.dWq, self.dWk, self.dWv, self.dWo]
