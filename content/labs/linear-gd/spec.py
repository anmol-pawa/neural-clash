"""Starter file shown to the player. Fill in the four functions."""
import numpy as np


def mse_loss_grad(w, X, y):
    """Return (loss, grad) for the model  y_hat = X @ w  with loss = mean((y_hat - y)**2).

    X: (N, D), w: (D,), y: (N,). grad has the same shape as w.
    """
    raise NotImplementedError


def gd_step(w, grad, lr):
    """Return the weights after one plain gradient-descent step."""
    raise NotImplementedError


def fit_linear(X, y, lr, epochs):
    """Train from w = 0 with full-batch gradient descent.

    Return (w, losses) where losses[i] is the training loss measured *before* step i,
    so len(losses) == epochs. Do not modify X or y.
    """
    raise NotImplementedError


def r2_score(w, X, y):
    """Test metric: 1 - SS_res / SS_tot, with SS_tot taken around the mean of y.

    A model no better than predicting mean(y) scores 0; a perfect one scores 1.
    """
    raise NotImplementedError
