"""Starter file shown to the player."""
import numpy as np


class Conv2D:
    """Cross-correlation over images shaped (N, C, H, W). W is (out_ch, in_ch, k, k), b is (out_ch,)."""

    def __init__(self, in_ch, out_ch, k, stride=1, pad=0, seed=0):
        """W ~ Normal(0, 1/(in_ch*k*k)) from np.random.default_rng(seed); b = zeros. Also create dW, db."""
        raise NotImplementedError

    def forward(self, x):
        """Zero-pad by `pad` on every side, slide the k x k kernels with `stride`, return (N, out_ch, Ho, Wo)."""
        raise NotImplementedError

    def backward(self, dout):
        """Given dLoss/dy, SET self.dW and self.db and return dLoss/dx (same shape as the input)."""
        raise NotImplementedError

    def params(self):
        return [self.W, self.b]

    def grads(self):
        return [self.dW, self.db]


class MaxPool2D:
    """Max over size x size windows, moving by `stride` (default: size). Windows that do not fit are dropped."""

    def __init__(self, size=2, stride=None):
        raise NotImplementedError

    def forward(self, x):
        """x is (N, C, H, W); return the window maxima."""
        raise NotImplementedError

    def backward(self, dout):
        """Send each output's gradient to the single input that won its window (first one on ties)."""
        raise NotImplementedError
