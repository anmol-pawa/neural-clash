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


def fit(X, y, lr, epochs):
    """Train from w = 0 with full-batch gradient descent for `epochs` steps.

    Return (w, history) where history is the list of losses measured *before* each step
    (length == epochs).
    """
    raise NotImplementedError


def r2_score(w, X, y):
    """Coefficient of determination of the model X @ w on (X, y): 1 - SS_res / SS_tot.

    1.0 is a perfect fit, 0.0 is no better than always predicting mean(y).
    If y is constant (SS_tot == 0) return 1.0 when the fit is exact, otherwise 0.0.
    """
    raise NotImplementedError
