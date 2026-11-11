"""Starter file shown to the player."""
import numpy as np


class MLP:
    """Fully connected classifier: sizes=[in, h1, ..., classes], one activation between layers, raw logits out."""

    def __init__(self, sizes, activation="tanh", seed=0):
        """rng = np.random.default_rng(seed); layer i: W = rng.normal(size=(sizes[i], sizes[i+1])) * sqrt(1/sizes[i]), b = zeros.
        Draw the layers in order. activation is "tanh" or "relu"."""
        raise NotImplementedError

    def forward(self, X):
        """Return logits (N, classes). Cache what backward needs."""
        raise NotImplementedError

    def loss_and_backward(self, X, y):
        """Forward X, compute mean softmax cross-entropy against integer labels y, backprop,
        store the gradients and return the loss."""
        raise NotImplementedError

    def params(self):
        """Flat list [W1, b1, W2, b2, ...] of the live arrays (not copies)."""
        raise NotImplementedError

    def grads(self):
        """Gradients in the same order and shapes as params()."""
        raise NotImplementedError

    def step(self, lr):
        """Plain SGD, in place: p -= lr * g for every parameter."""
        raise NotImplementedError

    def predict(self, X):
        raise NotImplementedError
