"""Starter file shown to the player."""
import numpy as np


# --- Provided: your Forge 12 attention (do not change) ---

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


# --- Your work: Forge 13 ---

def gelu(x):
    """tanh approximation: 0.5 x (1 + tanh(sqrt(2/pi) (x + 0.044715 x^3)))."""
    raise NotImplementedError


def gelu_backward(x, dout):
    """Gradient through gelu. x is the INPUT of gelu (not its output). Return dout * gelu'(x)."""
    raise NotImplementedError


class LayerNorm:
    """Normalise over the LAST axis (each token on its own): xhat = (x - mean) / sqrt(var + eps); y = gamma * xhat + beta.
    Biased variance (ddof=0). gamma starts at ones, beta at zeros. Works for any leading axes."""

    def __init__(self, dim, eps=1e-5):
        raise NotImplementedError

    def forward(self, x):
        raise NotImplementedError

    def backward(self, dout):
        """SET dgamma and dbeta (summed over every leading axis) and return dx."""
        raise NotImplementedError

    def params(self):
        return [self.gamma, self.beta]

    def grads(self):
        return [self.dgamma, self.dbeta]


class FeedForward:
    """Position-wise MLP: h = x W1 + b1; a = gelu(h); y = a W2 + b2.  x (N, T, d_model) -> (N, T, d_model)."""

    def __init__(self, d_model, d_ff, seed=0):
        """rng = np.random.default_rng(seed); W1 (d_model, d_ff) ~ Normal(0,1)/sqrt(d_model), then
        W2 (d_ff, d_model) ~ Normal(0,1)/sqrt(d_ff). Biases start at zero. Create dW1, db1, dW2, db2 too."""
        raise NotImplementedError

    def forward(self, x):
        raise NotImplementedError

    def backward(self, dout):
        """SET dW1, db1, dW2, db2 (summed over batch and time) and return dx."""
        raise NotImplementedError

    def params(self):
        return [self.W1, self.b1, self.W2, self.b2]

    def grads(self):
        return [self.dW1, self.db1, self.dW2, self.db2]


class TransformerBlock:
    """Pre-LN block:  x1 = x + Attn(LN1(x));  out = x1 + FFN(LN2(x1)).  The residual stream is never normalised."""

    def __init__(self, d_model, n_heads, d_ff, seed=0):
        """Attributes: ln1 = LayerNorm, attn = MultiHeadAttention(d_model, n_heads, seed=seed),
        ln2 = LayerNorm, ff = FeedForward(d_model, d_ff, seed=seed + 1). Two separate LayerNorm objects."""
        raise NotImplementedError

    def forward(self, x, causal=True):
        """Do not modify x. Keep the attention weights as self.attn_weights, shape (N, h, T, T)."""
        raise NotImplementedError

    def backward(self, dout):
        """Backprop through both sublayers AND both residual connections. Return dx."""
        raise NotImplementedError

    def params(self):
        """Order: ln1 (gamma, beta), attn (Wq, Wk, Wv, Wo), ln2 (gamma, beta), ff (W1, b1, W2, b2)."""
        raise NotImplementedError

    def grads(self):
        """Same order as params()."""
        raise NotImplementedError


def block_param_count(d_model, d_ff):
    """Trainable parameters of one block (attention has no biases; FFN has biases; two LayerNorms with gamma and beta)."""
    raise NotImplementedError


def block_flops(T, d_model, d_ff):
    """Forward FLOPs of one block for ONE sequence of T tokens. Count only matmuls and count a multiply-add as 2 FLOPs:
    the four d x d projections, the two T x T attention matmuls (Q K^T and A V, all heads together), and the two FFN matmuls."""
    raise NotImplementedError
