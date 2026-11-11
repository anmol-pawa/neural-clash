"""Starter file shown to the player."""
import numpy as np


class Dropout:
    """Inverted dropout."""

    def __init__(self, p=0.5, seed=0):
        """p is the probability of DROPPING a unit, in [0, 1) (otherwise ValueError).
        self.rng = np.random.default_rng(seed); self.training starts True."""
        raise NotImplementedError

    def train(self):
        raise NotImplementedError

    def eval(self):
        raise NotImplementedError

    def forward(self, x):
        """Training: mask = (rng.random(x.shape) >= p) / (1 - p); return x * mask, drawing a fresh mask on every call.
        Evaluation (or p == 0): return x unchanged."""
        raise NotImplementedError

    def backward(self, dout):
        """Gradient flows only through the units that were kept, with the same scaling."""
        raise NotImplementedError


class SGD:
    """Stochastic gradient descent with classical momentum and L2 weight decay."""

    def __init__(self, params, lr=0.1, momentum=0.0, weight_decay=0.0):
        """params is a list of numpy arrays, updated IN PLACE. Keep one velocity array per parameter (zeros)."""
        raise NotImplementedError

    def step(self, grads):
        """For each parameter: d = g + weight_decay * p;  v = momentum * v + d;  p -= lr * v.
        Do not modify the gradient arrays."""
        raise NotImplementedError


class AdamW:
    """Adam with decoupled weight decay."""

    def __init__(self, params, lr=1e-3, betas=(0.9, 0.999), eps=1e-8, weight_decay=0.01):
        """params: list of arrays updated in place. Keep first/second moment arrays m, v (zeros) and a step counter t."""
        raise NotImplementedError

    def step(self, grads):
        """t += 1.  p *= 1 - lr * weight_decay  (decay is NOT fed through m and v).
        m = b1*m + (1-b1)*g;  v = b2*v + (1-b2)*g*g;  bias-correct both with 1 - b^t;
        p -= lr * m_hat / (sqrt(v_hat) + eps)."""
        raise NotImplementedError
