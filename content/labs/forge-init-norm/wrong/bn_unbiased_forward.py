import numpy as np


def xavier_std(fan_in, fan_out):
    return float(np.sqrt(2.0 / (fan_in + fan_out)))


def he_std(fan_in):
    return float(np.sqrt(2.0 / fan_in))


def init_weights(fan_in, fan_out, kind="he", seed=0):
    if kind == "he":
        std = he_std(fan_in)
    elif kind == "xavier":
        std = xavier_std(fan_in, fan_out)
    else:
        raise ValueError("kind must be 'he' or 'xavier'")
    rng = np.random.default_rng(seed)
    return rng.normal(size=(fan_in, fan_out)) * std


class BatchNorm1d:
    def __init__(self, dim, eps=1e-5, momentum=0.1):
        self.eps, self.momentum = eps, momentum
        self.gamma, self.beta = np.ones(dim), np.zeros(dim)
        self.running_mean, self.running_var = np.zeros(dim), np.ones(dim)
        self.dgamma, self.dbeta = np.zeros(dim), np.zeros(dim)
        self.training = True

    def train(self):
        self.training = True

    def eval(self):
        self.training = False

    def forward(self, x):
        x = np.asarray(x, dtype=float)
        n = x.shape[0]
        if self.training:
            if n < 2:
                raise ValueError("BatchNorm needs at least 2 examples in training mode")
            mean = x.mean(axis=0)
            var = x.var(axis=0, ddof=1)
            m = self.momentum
            self.running_mean = (1 - m) * self.running_mean + m * mean
            self.running_var = (1 - m) * self.running_var + m * var * n / (n - 1)  # unbiased estimate
        else:
            mean, var = self.running_mean, self.running_var
        self._inv_std = 1.0 / np.sqrt(var + self.eps)
        self._xhat = (x - mean) * self._inv_std
        return self.gamma * self._xhat + self.beta

    def backward(self, dout):
        dout = np.asarray(dout, dtype=float)
        n = dout.shape[0]
        self.dgamma = (dout * self._xhat).sum(axis=0)
        self.dbeta = dout.sum(axis=0)
        dxhat = dout * self.gamma
        if not self.training:  # running statistics are constants
            return dxhat * self._inv_std
        return self._inv_std / n * (
            n * dxhat - dxhat.sum(axis=0) - self._xhat * (dxhat * self._xhat).sum(axis=0)
        )


class LayerNorm:
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
