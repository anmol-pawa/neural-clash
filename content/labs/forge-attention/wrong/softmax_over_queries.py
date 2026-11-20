import numpy as np


def causal_mask(T):
    """(T, T) bool, True where query i may attend key j: j <= i (a token sees itself and the past)."""
    return np.tril(np.ones((T, T), dtype=bool))


def masked_softmax(scores, mask=None):
    """Row softmax over the last axis. mask (broadcastable, True = keep). A fully masked row gives zeros, not NaN."""
    s = np.asarray(scores, dtype=float)
    if mask is None:
        z = s - s.max(axis=-1, keepdims=True)
        e = np.exp(z)
        return e / e.sum(axis=-1, keepdims=True)
    keep = np.broadcast_to(np.asarray(mask, dtype=bool), s.shape)
    s = np.where(keep, s, -np.inf)
    m = s.max(axis=-1, keepdims=True)
    m = np.where(np.isfinite(m), m, 0.0)  # an all -inf row would give -inf - -inf = NaN
    e = np.where(keep, np.exp(s - m), 0.0)
    denom = e.sum(axis=-1, keepdims=True)
    return e / np.where(denom > 0, denom, 1.0)


def sdpa(Q, K, V, mask=None):
    """Scaled dot-product attention over (..., T, d). Returns (out, A) with A = softmax(Q K^T / sqrt(d)) V's weights."""
    Q, K, V = (np.asarray(a, dtype=float) for a in (Q, K, V))
    d = Q.shape[-1]
    scores = Q @ np.swapaxes(K, -1, -2) / np.sqrt(d)
    A = np.swapaxes(masked_softmax(np.swapaxes(scores, -1, -2), None if mask is None else np.swapaxes(np.asarray(mask), -1, -2)), -1, -2)
    return A @ V, A


def sdpa_backward(dout, Q, K, V, A):
    """Gradients of sdpa. Returns (dQ, dK, dV). A is the weights returned by sdpa (masked entries are exactly 0)."""
    dout = np.asarray(dout, dtype=float)
    Q, K, V = (np.asarray(a, dtype=float) for a in (Q, K, V))
    d = Q.shape[-1]
    dV = np.swapaxes(A, -1, -2) @ dout
    dA = dout @ np.swapaxes(V, -1, -2)
    dS = A * (dA - (dA * A).sum(axis=-1, keepdims=True))  # softmax Jacobian-vector product; 0 where A == 0
    dS = dS / np.sqrt(d)
    dQ = dS @ K
    dK = np.swapaxes(dS, -1, -2) @ Q
    return dQ, dK, dV


class MultiHeadAttention:
    def __init__(self, d_model, n_heads, seed=0):
        if d_model % n_heads != 0:
            raise ValueError("d_model must be divisible by n_heads")
        self.d, self.h = d_model, n_heads
        rng = np.random.default_rng(seed)
        self.Wq = rng.normal(size=(d_model, d_model)) / np.sqrt(d_model)
        self.Wk = rng.normal(size=(d_model, d_model)) / np.sqrt(d_model)
        self.Wv = rng.normal(size=(d_model, d_model)) / np.sqrt(d_model)
        self.Wo = rng.normal(size=(d_model, d_model)) / np.sqrt(d_model)
        self.dWq, self.dWk, self.dWv, self.dWo = (np.zeros_like(w) for w in (self.Wq, self.Wk, self.Wv, self.Wo))
        self._cache = None

    def _split(self, a):
        N, T, _ = a.shape
        return a.reshape(N, T, self.h, self.d // self.h).transpose(0, 2, 1, 3)  # (N, h, T, dh)

    def _merge(self, a):
        N, _, T, _ = a.shape
        return a.transpose(0, 2, 1, 3).reshape(N, T, self.d)

    def forward(self, x, causal=True):
        x = np.asarray(x, dtype=float)
        T = x.shape[1]
        Q, K, V = (self._split(x @ W) for W in (self.Wq, self.Wk, self.Wv))
        out, A = sdpa(Q, K, V, causal_mask(T) if causal else None)
        ctx = self._merge(out)
        self.attn = A  # (N, h, T, T), kept for the visualiser
        self._cache = (x, Q, K, V, A, ctx)
        return ctx @ self.Wo

    def backward(self, dout):
        x, Q, K, V, A, ctx = self._cache
        dout = np.asarray(dout, dtype=float)
        self.dWo = np.einsum("ntd,nte->de", ctx, dout)
        dctx = self._split(dout @ self.Wo.T)
        dQ, dK, dV = sdpa_backward(dctx, Q, K, V, A)
        dQ, dK, dV = self._merge(dQ), self._merge(dK), self._merge(dV)
        self.dWq = np.einsum("ntd,nte->de", x, dQ)
        self.dWk = np.einsum("ntd,nte->de", x, dK)
        self.dWv = np.einsum("ntd,nte->de", x, dV)
        return dQ @ self.Wq.T + dK @ self.Wk.T + dV @ self.Wv.T

    def params(self):
        return [self.Wq, self.Wk, self.Wv, self.Wo]

    def grads(self):
        return [self.dWq, self.dWk, self.dWv, self.dWo]
