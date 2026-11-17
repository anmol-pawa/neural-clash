import numpy as np


class RNN:
    def __init__(self, in_dim, hidden, seed=0):
        rng = np.random.default_rng(seed)
        self.Wxh = rng.normal(size=(in_dim, hidden)) / np.sqrt(in_dim)
        self.Whh = rng.normal(size=(hidden, hidden)) / np.sqrt(hidden)
        self.bh = np.zeros(hidden)
        self.dWxh = np.zeros_like(self.Wxh)
        self.dWhh = np.zeros_like(self.Whh)
        self.dbh = np.zeros_like(self.bh)
        self._xs = None
        self._hs = None

    def forward(self, xs):
        xs = np.asarray(xs, dtype=float)
        n, T, _ = xs.shape
        hs = np.zeros((n, T + 1, self.bh.shape[0]))  # hs[:, 0] is the zero start state
        for t in range(T):  # time is inherently sequential; batch and hidden stay vectorised
            hs[:, t + 1] = np.tanh(xs[:, t] @ self.Wxh + hs[:, t] @ self.Whh + self.bh)
        self._xs, self._hs = xs, hs
        return hs[:, 1:]

    def backward(self, dhs):
        dhs = np.asarray(dhs, dtype=float)
        xs, hs = self._xs, self._hs
        n, T, _ = xs.shape
        self.dWxh = np.zeros_like(self.Wxh)
        self.dWhh = np.zeros_like(self.Whh)
        self.dbh = np.zeros_like(self.bh)
        dxs = np.zeros_like(xs)
        dh_next = np.zeros((n, self.bh.shape[0]))  # gradient arriving from the future
        for t in reversed(range(T)):
            dh = dhs[:, t] + dh_next               # this step's own loss + everything downstream
            da = dh * (1.0 - hs[:, t + 1] ** 2)    # through tanh
            self.dWxh += xs[:, t].T @ da           # the same weights are used at every step: sum
            self.dWhh += hs[:, t].T @ da           # uses the PREVIOUS state
            self.dbh += da.sum(axis=0)
            dxs[:, t] = da @ self.Wxh.T
            dh_next = da @ self.Whh.T
        return dxs

    def params(self):
        return [self.Wxh, self.Whh, self.bh]

    def grads(self):
        return [self.dWxh, self.dWhh, self.dbh]


def _sigmoid(a):
    return 1.0 / (1.0 + np.exp(-a))


class GRUCell:
    def __init__(self, in_dim, hidden, seed=0):
        rng = np.random.default_rng(seed)
        self.H = hidden
        self.Wx = rng.normal(size=(in_dim, 3 * hidden)) / np.sqrt(in_dim)
        self.Wh = rng.normal(size=(hidden, 3 * hidden)) / np.sqrt(hidden)
        self.b = np.zeros(3 * hidden)
        self.dWx = np.zeros_like(self.Wx)
        self.dWh = np.zeros_like(self.Wh)
        self.db = np.zeros_like(self.b)
        self._cache = None

    def forward(self, x, h):
        x, h = np.asarray(x, dtype=float), np.asarray(h, dtype=float)
        H = self.H
        ax = x @ self.Wx + self.b
        ah = h @ self.Wh
        z = _sigmoid(ax[:, :H] + ah[:, :H])
        r = _sigmoid(ax[:, H:2 * H] + ah[:, H:2 * H])
        q = ah[:, 2 * H:]                       # h @ U_n, BEFORE the reset gate scales it
        n = np.tanh(ax[:, 2 * H:] + r * q)
        self._cache = (x, h, z, r, q, n)
        return (1.0 - z) * n + z * h

    def backward(self, dh_new):
        x, h, z, r, q, n = self._cache
        dh_new = np.asarray(dh_new, dtype=float)
        dn = dh_new * (1.0 - z)
        dz = dh_new * (n - h)
        dan = dn * (1.0 - n ** 2)
        daz = dz * z * (1.0 - z)
        dar = dan * q * r * (1.0 - r)
        dq = dan * r
        da_x = np.concatenate([daz, dar, dan], axis=1)
        da_h = np.concatenate([daz, dar, dq], axis=1)
        self.dWx = x.T @ da_x
        self.dWh = h.T @ da_h
        self.db = da_x.sum(axis=0)
        dx = da_x @ self.Wx.T
        dh = dh_new * z + da_h @ self.Wh.T      # the direct highway path plus the three gate paths
        return dx, dh

    def params(self):
        return [self.Wx, self.Wh, self.b]

    def grads(self):
        return [self.dWx, self.dWh, self.db]
