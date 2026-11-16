"""Starter file shown to the player."""
import numpy as np


class RNN:
    """Many-to-one vanilla RNN on sequences shaped (N, T, D). Row-vector convention: h = x @ Wx + h @ Wh."""

    def __init__(self, in_dim, hidden, out_dim, seed=0):
        """Wx ~ Normal(0, 1/in_dim), Wh and Wy ~ Normal(0, 1/hidden), drawn in the order Wx, Wh, Wy from
        np.random.default_rng(seed); bh and by are zeros. Also create dWx, dWh, dWy, dbh, dby and dh_norms = []."""
        raise NotImplementedError

    def forward(self, x):
        """h_0 = 0; h_t = tanh(x_t @ Wx + h_{t-1} @ Wh + bh). Return logits = h_T @ Wy + by, shape (N, out_dim)."""
        raise NotImplementedError

    def backward(self, dlogits):
        """Backpropagation through time. SET dWx, dWh, dbh, dWy, dby (summed over time and batch), set
        dh_norms[t] = Frobenius norm of dLoss/dh_{t+1} (the state after reading x_t), and return dx (N, T, D)."""
        raise NotImplementedError

    def params(self):
        return [self.Wx, self.Wh, self.bh, self.Wy, self.by]

    def grads(self):
        return [self.dWx, self.dWh, self.dbh, self.dWy, self.dby]


class GRUCell:
    """One gated-recurrent-unit step. Gates:
        z  = sigmoid(x @ Wz + h @ Uz + bz)          update gate
        r  = sigmoid(x @ Wr + h @ Ur + br)          reset gate
        n  = tanh(x @ Wn + (r * h) @ Un + bn)       candidate (the reset gate acts BEFORE the matmul)
        h' = (1 - z) * n + z * h
    """

    def __init__(self, in_dim, hidden, seed=0):
        """W* ~ Normal(0, 1/in_dim), U* ~ Normal(0, 1/hidden), drawn in the order Wz, Uz, Wr, Ur, Wn, Un
        from np.random.default_rng(seed); biases are zeros. Also create a gradient (d + name) for each."""
        raise NotImplementedError

    def forward(self, x, h):
        """x is (N, D), h is (N, H); return the new state (N, H). Remember what backward needs."""
        raise NotImplementedError

    def backward(self, dh_new):
        """SET the nine parameter gradients for this one step and return (dx, dh), the gradients w.r.t. x and the old h."""
        raise NotImplementedError

    def params(self):
        return [self.Wz, self.Uz, self.bz, self.Wr, self.Ur, self.br, self.Wn, self.Un, self.bn]

    def grads(self):
        return [self.dWz, self.dUz, self.dbz, self.dWr, self.dUr, self.dbr, self.dWn, self.dUn, self.dbn]
