"""Starter file shown to the player."""
import numpy as np


def xavier_std(fan_in, fan_out):
    """Glorot/Xavier standard deviation: sqrt(2 / (fan_in + fan_out))."""
    raise NotImplementedError


def he_std(fan_in):
    """He/Kaiming standard deviation for ReLU layers: sqrt(2 / fan_in)."""
    raise NotImplementedError


def init_weights(fan_in, fan_out, kind="he", seed=0):
    """Weights of shape (fan_in, fan_out): rng = np.random.default_rng(seed); rng.normal(size=...) * std.
    kind is "he" or "xavier"; anything else raises ValueError."""
    raise NotImplementedError


class BatchNorm1d:
    """Normalise each feature over the batch axis. x has shape (N, dim)."""

    def __init__(self, dim, eps=1e-5, momentum=0.1):
        """Learnable gamma=ones, beta=zeros. Running stats running_mean=zeros, running_var=ones.
        Also dgamma and dbeta (zeros). self.training starts True."""
        raise NotImplementedError

    def train(self):
        raise NotImplementedError

    def eval(self):
        raise NotImplementedError

    def forward(self, x):
        """Training: normalise with the batch mean and BIASED variance, then update the running stats
        with running = (1-momentum)*running + momentum*batch, using the UNBIASED variance (N/(N-1)) for the running one.
        Evaluation: normalise with the running stats and leave them untouched.
        Output gamma*xhat + beta, with xhat = (x-mean)/sqrt(var+eps). Training with N < 2 raises ValueError."""
        raise NotImplementedError

    def backward(self, dout):
        """Set (not accumulate) dgamma and dbeta, return dx. In training mode dx must account for the batch
        mean and variance depending on x. In evaluation mode the running stats are constants."""
        raise NotImplementedError


class LayerNorm:
    """Normalise each example over its last axis. x has shape (..., dim); no running stats, no train/eval switch."""

    def __init__(self, dim, eps=1e-5):
        """gamma=ones, beta=zeros, dgamma and dbeta zeros."""
        raise NotImplementedError

    def forward(self, x):
        raise NotImplementedError

    def backward(self, dout):
        """Set dgamma and dbeta (summed over every leading axis), return dx."""
        raise NotImplementedError
