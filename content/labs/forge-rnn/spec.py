"""Starter file shown to the player."""
import numpy as np


class RNN:
    """Many-to-one tanh RNN. Input x is (N, T, D); the output is the logits read from the LAST hidden state."""

    def __init__(self, in_dim, hidden, out_dim, seed=0):
        """Draw from np.random.default_rng(seed), in this order:
        Wxh (D, H) ~ Normal(0, 1/D), Whh (H, H) ~ Normal(0, 1/H), Why (H, C) ~ Normal(0, 1/H).
        bh and by are zeros. Create a gradient array for every parameter (dWxh, dWhh, dbh, dWhy, dby)."""
        raise NotImplementedError

    def forward(self, x):
        """h_0 = 0; h_t = tanh(x_t @ Wxh + h_{t-1} @ Whh + bh); return h_T @ Why + by with shape (N, C).
        Every call starts from a fresh zero state. Keep what backward needs."""
        raise NotImplementedError

    def backward(self, dlogits):
        """Backpropagation through time. SET all five gradients (summed over the batch and over time)
        and return dLoss/dx with the shape of x."""
        raise NotImplementedError

    def params(self):
        return [self.Wxh, self.Whh, self.bh, self.Why, self.by]

    def grads(self):
        return [self.dWxh, self.dWhh, self.dbh, self.dWhy, self.dby]


class GRUCell:
    """One GRU step on a batch: x is (N, D), h is (N, H). Gate columns are packed in the order [z | r | n]."""

    def __init__(self, in_dim, hidden, seed=0):
        """Wx (D, 3H) ~ Normal(0, 1/D) then Wh (H, 3H) ~ Normal(0, 1/H) from np.random.default_rng(seed); b = zeros(3H).
        Create dWx, dWh, db as well."""
        raise NotImplementedError

    def forward(self, x, h):
        """z = sigmoid(x Wx_z + h Wh_z + b_z); r = sigmoid(x Wx_r + h Wh_r + b_r)
        n = tanh(x Wx_n + r * (h Wh_n) + b_n); return h' = (1 - z) * n + z * h."""
        raise NotImplementedError

    def backward(self, dh_new):
        """SET dWx, dWh, db and return (dx, dh): the gradients with respect to this step's x and previous h."""
        raise NotImplementedError

    def params(self):
        return [self.Wx, self.Wh, self.b]

    def grads(self):
        return [self.dWx, self.dWh, self.db]
