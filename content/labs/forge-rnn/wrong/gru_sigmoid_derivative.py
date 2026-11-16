import numpy as np


def _sigmoid(a):
    return 1.0 / (1.0 + np.exp(-a))


class RNN:
    def __init__(self, in_dim, hidden, out_dim, seed=0):
        rng = np.random.default_rng(seed)
        self.Wxh = rng.normal(size=(in_dim, hidden)) / np.sqrt(in_dim)
        self.Whh = rng.normal(size=(hidden, hidden)) / np.sqrt(hidden)
        self.Why = rng.normal(size=(hidden, out_dim)) / np.sqrt(hidden)
        self.bh = np.zeros(hidden)
        self.by = np.zeros(out_dim)
        self.dWxh = np.zeros_like(self.Wxh)
        self.dWhh = np.zeros_like(self.Whh)
        self.dbh = np.zeros_like(self.bh)
        self.dWhy = np.zeros_like(self.Why)
        self.dby = np.zeros_like(self.by)
        self._x = None
        self._hs = None

    def forward(self, x):
        x = np.asarray(x, dtype=float)
        n, t_len, _ = x.shape
        hs = [np.zeros((n, self.Whh.shape[0]))]
        for t in range(t_len):
            hs.append(np.tanh(x[:, t] @ self.Wxh + hs[-1] @ self.Whh + self.bh))
        self._x, self._hs = x, hs
        return hs[-1] @ self.Why + self.by

    def backward(self, dlogits):
        dlogits = np.asarray(dlogits, dtype=float)
        x, hs = self._x, self._hs
        self.dWhy = hs[-1].T @ dlogits
        self.dby = dlogits.sum(axis=0)
        self.dWxh = np.zeros_like(self.Wxh)
        self.dWhh = np.zeros_like(self.Whh)
        self.dbh = np.zeros_like(self.bh)
        dx = np.zeros_like(x)
        dh = dlogits @ self.Why.T
        for t in range(x.shape[1] - 1, -1, -1):
            da = dh * (1.0 - hs[t + 1] ** 2)  # through tanh
            self.dWxh += x[:, t].T @ da
            self.dWhh += hs[t].T @ da
            self.dbh += da.sum(axis=0)
            dx[:, t] = da @ self.Wxh.T
            dh = da @ self.Whh.T  # flows to the previous hidden state
        return dx

    def params(self):
        return [self.Wxh, self.Whh, self.bh, self.Why, self.by]

    def grads(self):
        return [self.dWxh, self.dWhh, self.dbh, self.dWhy, self.dby]


class GRUCell:
    def __init__(self, in_dim, hidden, seed=0):
        rng = np.random.default_rng(seed)
        self.Wx = rng.normal(size=(in_dim, 3 * hidden)) / np.sqrt(in_dim)
        self.Wh = rng.normal(size=(hidden, 3 * hidden)) / np.sqrt(hidden)
        self.b = np.zeros(3 * hidden)
        self.dWx = np.zeros_like(self.Wx)
        self.dWh = np.zeros_like(self.Wh)
        self.db = np.zeros_like(self.b)
        self.H = hidden
        self._cache = None

    def forward(self, x, h):
        x = np.asarray(x, dtype=float)
        h = np.asarray(h, dtype=float)
        H = self.H
        ax = x @ self.Wx + self.b
        ah = h @ self.Wh
        z = _sigmoid(ax[:, :H] + ah[:, :H])
        r = _sigmoid(ax[:, H:2 * H] + ah[:, H:2 * H])
        n = np.tanh(ax[:, 2 * H:] + r * ah[:, 2 * H:])
        self._cache = (x, h, z, r, n, ah[:, 2 * H:])
        return (1.0 - z) * n + z * h

    def backward(self, dh_new):
        dh_new = np.asarray(dh_new, dtype=float)
        x, h, z, r, n, hn = self._cache
        dn = dh_new * (1.0 - z)
        dz = dh_new * (h - n)
        da_n = dn * (1.0 - n ** 2)
        dr = da_n * hn
        da_z = dz * z
        da_r = dr * r * (1.0 - r)
        da = np.concatenate([da_z, da_r, da_n], axis=1)  # pre-activation gradients, packed like Wx
        dah = np.concatenate([da_z, da_r, da_n * r], axis=1)  # the candidate's h-path is gated by r
        self.dWx = x.T @ da
        self.dWh = h.T @ dah
        self.db = da.sum(axis=0)
        dx = da @ self.Wx.T
        dh = dh_new * z + dah @ self.Wh.T
        return dx, dh

    def params(self):
        return [self.Wx, self.Wh, self.b]

    def grads(self):
        return [self.dWx, self.dWh, self.db]
