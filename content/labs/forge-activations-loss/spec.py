"""Starter file shown to the player."""
import numpy as np


class ReLU:
    def forward(self, x):
        raise NotImplementedError

    def backward(self, dout):
        raise NotImplementedError


class Tanh:
    def forward(self, x):
        raise NotImplementedError

    def backward(self, dout):
        raise NotImplementedError


class Sigmoid:
    def forward(self, x):
        """Must not overflow for large |x|."""
        raise NotImplementedError

    def backward(self, dout):
        raise NotImplementedError


def softmax_cross_entropy(logits, targets):
    """logits (N, C), targets (N,) integer class ids. Return (mean loss, dLoss/dlogits). Stable for huge logits."""
    raise NotImplementedError


def mse_loss(pred, target):
    """Mean over ALL elements of (pred - target)**2. Return (loss, dLoss/dpred)."""
    raise NotImplementedError


def bce_with_logits(logits, y):
    """Mean binary cross-entropy of sigmoid(logits) against y in {0, 1}, computed from the logits. Return (loss, dlogits)."""
    raise NotImplementedError
