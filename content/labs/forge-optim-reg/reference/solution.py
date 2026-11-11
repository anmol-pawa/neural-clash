import numpy as np


class Dropout:
    def __init__(self, p=0.5, seed=0):
        if not 0.0 <= p < 1.0:
            raise ValueError("p must be in [0, 1)")
        self.p = p
        self.rng = np.random.default_rng(seed)
        self.training = True
        self._mask = None

    def train(self):
        self.training = True

    def eval(self):
        self.training = False

    def forward(self, x):
        x = np.asarray(x, dtype=float)
        if not self.training or self.p == 0.0:
            self._mask = None
            return x
        # inverted dropout: scale the survivors now so evaluation needs no change
        self._mask = (self.rng.random(x.shape) >= self.p) / (1.0 - self.p)
        return x * self._mask

    def backward(self, dout):
        dout = np.asarray(dout, dtype=float)
        return dout if self._mask is None else dout * self._mask


class SGD:
    def __init__(self, params, lr=0.1, momentum=0.0, weight_decay=0.0):
        self.params, self.lr = params, lr
        self.momentum, self.weight_decay = momentum, weight_decay
        self.velocity = [np.zeros_like(p) for p in params]

    def step(self, grads):
        for p, g, v in zip(self.params, grads, self.velocity):
            d = g + self.weight_decay * p  # L2 penalty enters through the gradient
            v *= self.momentum
            v += d
            p -= self.lr * v


class AdamW:
    def __init__(self, params, lr=1e-3, betas=(0.9, 0.999), eps=1e-8, weight_decay=0.01):
        self.params, self.lr, self.betas = params, lr, betas
        self.eps, self.weight_decay = eps, weight_decay
        self.m = [np.zeros_like(p) for p in params]
        self.v = [np.zeros_like(p) for p in params]
        self.t = 0

    def step(self, grads):
        self.t += 1
        b1, b2 = self.betas
        for p, g, m, v in zip(self.params, grads, self.m, self.v):
            p *= 1.0 - self.lr * self.weight_decay  # decoupled decay: not routed through m and v
            m *= b1
            m += (1 - b1) * g
            v *= b2
            v += (1 - b2) * g * g
            m_hat = m / (1 - b1 ** self.t)
            v_hat = v / (1 - b2 ** self.t)
            p -= self.lr * m_hat / (np.sqrt(v_hat) + self.eps)
