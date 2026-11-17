"""Starter file shown to the player."""
import numpy as np


class RNN:
    """Vanilla recurrent layer over sequences shaped (N, T, D). h_t = tanh(x_t @ Wxh + h_{t-1} @ Whh + bh)."""

    def __init__(self, in_dim, hidden, seed=0):
        """rng = np.random.default_rng(seed); Wxh ~ Normal(0,1)/sqrt(in_dim) (drawn first), then
        Whh ~ Normal(0,1)/sqrt(hidden). bh = zeros. Also create dWxh, dWhh, dbh."""
        raise NotImplementedError

    def forward(self, xs):
        """Start from h_0 = 0 on every call. Return all hidden states, shape (N, T, hidden)."""
        raise NotImplementedError

    def backward(self, dhs):
        """dhs (N, T, hidden) is dLoss/dh_t for every step (zeros where a step has no loss of its own).
        SET dWxh, dWhh, dbh (summed over time and batch) and return dLoss/dxs, shape (N, T, D)."""
        raise NotImplementedError

    def params(self):
        return [self.Wxh, self.Whh, self.bh]

    def grads(self):
        return [self.dWxh, self.dWhh, self.dbh]


class GRUCell:
    """One gated step. Gates are packed in column blocks [z | r | n]: Wx (D, 3H), Wh (H, 3H), b (3H,).

    z = sigmoid(x Wx_z + h Wh_z + b_z)          update gate
    r = sigmoid(x Wx_r + h Wh_r + b_r)          reset gate
    n = tanh(x Wx_n + r * (h Wh_n) + b_n)       candidate (reset scales h's contribution AFTER the matmul)
    h' = (1 - z) * n + z * h
    """

    def __init__(self, in_dim, hidden, seed=0):
        """Wx ~ Normal(0,1)/sqrt(in_dim) (drawn first), Wh ~ Normal(0,1)/sqrt(hidden), b = zeros; dWx, dWh, db."""
        raise NotImplementedError

    def forward(self, x, h):
        """x (N, D), h (N, H) -> h' (N, H)."""
        raise NotImplementedError

    def backward(self, dh_new):
        """SET dWx, dWh, db; return (dx, dh) where dh is dLoss/dh (the previous state)."""
        raise NotImplementedError

    def params(self):
        return [self.Wx, self.Wh, self.b]

    def grads(self):
        return [self.dWx, self.dWh, self.db]
