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
    A = masked_softmax(scores, mask)
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


# ---------------------------------------------------------------------------
# Forge 13: the pre-LN transformer block
# ---------------------------------------------------------------------------

_GELU_C = np.sqrt(2.0 / np.pi)


def gelu(x):
    """tanh approximation of GELU: 0.5 x (1 + tanh(sqrt(2/pi) (x + 0.044715 x^3)))."""
    x = np.asarray(x, dtype=float)
    return 0.5 * x * (1.0 + np.tanh(_GELU_C * (x + 0.044715 * x**3)))


def gelu_backward(x, dout):
    """d gelu / d x times dout. x is the INPUT of gelu."""
    x = np.asarray(x, dtype=float)
    t = np.tanh(_GELU_C * (x + 0.044715 * x**3))
    dt = (1.0 - t**2) * _GELU_C * (1.0 + 3 * 0.044715 * x**2)
    return np.asarray(dout, dtype=float) * (0.5 * (1.0 + t) + 0.5 * x * dt)


class LayerNorm:
    """Normalise over the LAST axis (each token on its own), then scale by gamma and shift by beta."""

    def __init__(self, dim, eps=1e-5):
        self.eps = eps
        self.gamma, self.beta = np.ones(dim), np.zeros(dim)
        self.dgamma, self.dbeta = np.zeros(dim), np.zeros(dim)

    def forward(self, x):
        x = np.asarray(x, dtype=float)
        mean = x.mean(axis=-1, keepdims=True)
        var = x.var(axis=-1, keepdims=True)
        self._inv_std = 1.0 / np.sqrt(var + self.eps)
        self._xhat = (x - mean) * self._inv_std
        return self.gamma * self._xhat + self.beta

    def backward(self, dout):
        dout = np.asarray(dout, dtype=float)
        d = dout.shape[-1]
        lead = tuple(range(dout.ndim - 1))
        self.dgamma = (dout * self._xhat).sum(axis=lead)
        self.dbeta = dout.sum(axis=lead)
        dxhat = dout * self.gamma
        return self._inv_std / d * (
            d * dxhat
            - dxhat.sum(axis=-1, keepdims=True)
            - self._xhat * (dxhat * self._xhat).sum(axis=-1, keepdims=True)
        )

    def params(self):
        return [self.gamma, self.beta]

    def grads(self):
        return [self.dgamma, self.dbeta]


class FeedForward:
    """Position-wise MLP: Linear(d_model, d_ff) -> GELU -> Linear(d_ff, d_model), with biases."""

    def __init__(self, d_model, d_ff, seed=0):
        rng = np.random.default_rng(seed)
        self.W1 = rng.normal(size=(d_model, d_ff)) / np.sqrt(d_model)
        self.b1 = np.zeros(d_ff)
        self.W2 = rng.normal(size=(d_ff, d_model)) / np.sqrt(d_ff)
        self.b2 = np.zeros(d_model)
        self.dW1, self.db1 = np.zeros_like(self.W1), np.zeros_like(self.b1)
        self.dW2, self.db2 = np.zeros_like(self.W2), np.zeros_like(self.b2)

    def forward(self, x):
        x = np.asarray(x, dtype=float)
        h = x @ self.W1 + self.b1
        a = gelu(h)
        self._cache = (x, h, a)
        return a @ self.W2 + self.b2

    def backward(self, dout):
        x, h, a = self._cache
        dout = np.asarray(dout, dtype=float)
        self.dW2 = np.einsum("ntf,ntd->fd", a, dout)
        self.db2 = dout.sum(axis=(0, 1))
        dh = gelu_backward(h, dout @ self.W2.T)
        self.dW1 = np.einsum("ntd,ntf->df", x, dh)
        self.db1 = dh.sum(axis=(0, 1))
        return dh @ self.W1.T

    def params(self):
        return [self.W1, self.b1, self.W2, self.b2]

    def grads(self):
        return [self.dW1, self.db1, self.dW2, self.db2]


class TransformerBlock:
    """Pre-LN block:  x1 = x + Attn(LN1(x));  out = x1 + FFN(LN2(x1))."""

    def __init__(self, d_model, n_heads, d_ff, seed=0):
        self.ln1 = LayerNorm(d_model)
        self.attn = MultiHeadAttention(d_model, n_heads, seed=seed)
        self.ln2 = LayerNorm(d_model)
        self.ff = FeedForward(d_model, d_ff, seed=seed + 1)

    def forward(self, x, causal=True):
        x = np.asarray(x, dtype=float)
        x1 = x + self.attn.forward(self.ln1.forward(x), causal=causal)
        self.attn_weights = self.attn.attn  # (N, h, T, T), kept for the visualiser
        return x1 + self.ff.forward(self.ln2.forward(x1))

    def backward(self, dout):
        dout = np.asarray(dout, dtype=float)
        dx1 = self.ln2.backward(self.ff.backward(dout))
        return dx1 + self.ln1.backward(self.attn.backward(dx1))

    def params(self):
        return self.ln1.params() + self.attn.params() + self.ln2.params() + self.ff.params()

    def grads(self):
        return self.ln1.grads() + self.attn.grads() + self.ln2.grads() + self.ff.grads()


def block_param_count(d_model, d_ff):
    """Trainable parameters of one block: 4 d^2 attention (no biases) + FFN weights and biases + 2 LayerNorms."""
    attention = 4 * d_model * d_model
    ffn = 2 * d_model * d_ff + d_ff + d_model
    norms = 2 * 2 * d_model
    return attention + ffn + norms


def block_flops(T, d_model, d_ff):
    """Forward FLOPs of one block for ONE sequence of T tokens, counting only matmuls (a multiply-add = 2 FLOPs).
    Projections Wq Wk Wv Wo, the two T x T attention matmuls, and the two FFN matmuls."""
    projections = 4 * 2 * T * d_model * d_model
    attention = 2 * (2 * T * T * d_model)
    ffn = 2 * (2 * T * d_model * d_ff)
    return projections + attention + ffn
