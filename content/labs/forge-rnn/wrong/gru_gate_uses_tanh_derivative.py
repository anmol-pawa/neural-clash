import numpy as np


def _sigmoid(a):
    # Stable for large |a|: exp is only ever taken of a non-positive number.
    e = np.exp(-np.abs(a))
    return np.where(a >= 0, 1.0 / (1.0 + e), e / (1.0 + e))


class RNN:
    def __init__(self, in_dim, hidden, out_dim, seed=0):
        rng = np.random.default_rng(seed)
        self.Wx = rng.normal(size=(in_dim, hidden)) / np.sqrt(in_dim)
        self.Wh = rng.normal(size=(hidden, hidden)) / np.sqrt(hidden)
        self.Wy = rng.normal(size=(hidden, out_dim)) / np.sqrt(hidden)
        self.bh = np.zeros(hidden)
        self.by = np.zeros(out_dim)
        self.zero_grads()
        self.dh_norms = []
        self._x = None
        self._hs = None

    def zero_grads(self):
        self.dWx, self.dWh, self.dWy = np.zeros_like(self.Wx), np.zeros_like(self.Wh), np.zeros_like(self.Wy)
        self.dbh, self.dby = np.zeros_like(self.bh), np.zeros_like(self.by)

    def forward(self, x):
        x = np.asarray(x, dtype=float)
        n, steps, _ = x.shape
        hs = np.zeros((n, steps + 1, self.Wh.shape[0]))  # hs[:, 0] is the all-zero start state
        for t in range(steps):
            hs[:, t + 1] = np.tanh(x[:, t] @ self.Wx + hs[:, t] @ self.Wh + self.bh)
        self._x, self._hs = x, hs
        return hs[:, -1] @ self.Wy + self.by

    def backward(self, dlogits):
        dlogits = np.asarray(dlogits, dtype=float)
        x, hs = self._x, self._hs
        steps = x.shape[1]
        self.zero_grads()  # gradients are SET by each backward call, never accumulated
        self.dWy = hs[:, -1].T @ dlogits
        self.dby = dlogits.sum(axis=0)
        dx = np.zeros_like(x)
        norms = np.zeros(steps)
        dh = dlogits @ self.Wy.T  # dL/dh_T
        for t in range(steps - 1, -1, -1):
            norms[t] = np.linalg.norm(dh)
            da = dh * (1.0 - hs[:, t + 1] ** 2)  # through tanh
            # The same weights are used at every step, so their gradients add up over time.
            self.dWx += x[:, t].T @ da
            self.dWh += hs[:, t].T @ da
            self.dbh += da.sum(axis=0)
            dx[:, t] = da @ self.Wx.T
            dh = da @ self.Wh.T  # flows back to the previous state
        self.dh_norms = norms.tolist()
        return dx

    def params(self):
        return [self.Wx, self.Wh, self.bh, self.Wy, self.by]

    def grads(self):
        return [self.dWx, self.dWh, self.dbh, self.dWy, self.dby]


class GRUCell:
    def __init__(self, in_dim, hidden, seed=0):
        rng = np.random.default_rng(seed)
        self.Wz = rng.normal(size=(in_dim, hidden)) / np.sqrt(in_dim)
        self.Uz = rng.normal(size=(hidden, hidden)) / np.sqrt(hidden)
        self.Wr = rng.normal(size=(in_dim, hidden)) / np.sqrt(in_dim)
        self.Ur = rng.normal(size=(hidden, hidden)) / np.sqrt(hidden)
        self.Wn = rng.normal(size=(in_dim, hidden)) / np.sqrt(in_dim)
        self.Un = rng.normal(size=(hidden, hidden)) / np.sqrt(hidden)
        self.bz, self.br, self.bn = np.zeros(hidden), np.zeros(hidden), np.zeros(hidden)
        self.zero_grads()
        self._cache = None

    def zero_grads(self):
        for name in ("Wz", "Uz", "bz", "Wr", "Ur", "br", "Wn", "Un", "bn"):
            setattr(self, "d" + name, np.zeros_like(getattr(self, name)))

    def forward(self, x, h):
        x, h = np.asarray(x, dtype=float), np.asarray(h, dtype=float)
        z = _sigmoid(x @ self.Wz + h @ self.Uz + self.bz)
        r = _sigmoid(x @ self.Wr + h @ self.Ur + self.br)
        n = np.tanh(x @ self.Wn + (r * h) @ self.Un + self.bn)
        self._cache = (x, h, z, r, n)
        return (1.0 - z) * n + z * h

    def backward(self, dh_new):
        x, h, z, r, n = self._cache
        dh_new = np.asarray(dh_new, dtype=float)
        dn = dh_new * (1.0 - z)
        dz = dh_new * (h - n)
        dh = dh_new * z  # the direct skip path: state copied through when z is near 1
        dan = dn * (1.0 - n ** 2)
        self.dWn, self.dUn, self.dbn = x.T @ dan, (r * h).T @ dan, dan.sum(axis=0)
        drh = dan @ self.Un.T  # gradient w.r.t. (r * h)
        dr = drh * h
        dh = dh + drh * r
        dx = dan @ self.Wn.T
        daz = dz * (1.0 - z ** 2)
        dar = dr * r * (1.0 - r)
        self.dWz, self.dUz, self.dbz = x.T @ daz, h.T @ daz, daz.sum(axis=0)
        self.dWr, self.dUr, self.dbr = x.T @ dar, h.T @ dar, dar.sum(axis=0)
        dx = dx + daz @ self.Wz.T + dar @ self.Wr.T
        dh = dh + daz @ self.Uz.T + dar @ self.Ur.T
        return dx, dh

    def params(self):
        return [self.Wz, self.Uz, self.bz, self.Wr, self.Ur, self.br, self.Wn, self.Un, self.bn]

    def grads(self):
        return [self.dWz, self.dUz, self.dbz, self.dWr, self.dUr, self.dbr, self.dWn, self.dUn, self.dbn]
