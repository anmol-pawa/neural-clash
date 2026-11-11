import numpy as np


class ReLU:
    def forward(self, x):
        self._mask = np.asarray(x) > 0
        return np.where(self._mask, x, 0.0)

    def backward(self, dout):
        return dout * self._mask


class Tanh:
    def forward(self, x):
        self._y = np.tanh(x)
        return self._y

    def backward(self, dout):
        return dout * (1.0 - self._y ** 2)


class Sigmoid:
    def forward(self, x):
        x = np.asarray(x, dtype=float)
        e = np.exp(-np.abs(x))  # never overflows: the exponent is <= 0
        self._y = np.where(x >= 0, 1.0 / (1.0 + e), e / (1.0 + e))
        return self._y

    def backward(self, dout):
        return dout * self._y * (1.0 - self._y)


def softmax_cross_entropy(logits, targets):
    logits = np.asarray(logits, dtype=float)
    n = logits.shape[0]
    shifted = logits
    log_z = np.log(np.exp(shifted).sum(axis=1, keepdims=True))
    log_p = shifted - log_z
    loss = -log_p[np.arange(n), targets].mean()
    grad = np.exp(log_p)
    grad[np.arange(n), targets] -= 1.0
    return float(loss), grad / n


def mse_loss(pred, target):
    diff = np.asarray(pred, dtype=float) - np.asarray(target, dtype=float)
    return float((diff ** 2).mean()), 2.0 * diff / diff.size


def bce_with_logits(logits, y):
    z = np.asarray(logits, dtype=float)
    y = np.asarray(y, dtype=float)
    # max(z, 0) - z*y + log(1 + exp(-|z|)) is exact and finite for any z
    per = np.maximum(z, 0.0) - z * y + np.log1p(np.exp(-np.abs(z)))
    s = np.where(z >= 0, 1.0 / (1.0 + np.exp(-np.abs(z))), np.exp(-np.abs(z)) / (1.0 + np.exp(-np.abs(z))))
    return float(per.mean()), (s - y) / z.size
