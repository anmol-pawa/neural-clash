"""Starter file shown to the player. Fill in the two functions."""
import numpy as np


def fit_linear(X, y, lr=0.1, epochs=200):
    """Train y_hat = X @ w + b by full-batch GD on the mean squared error.

    Start from w = zeros(D), b = 0.0. Return (w, b, losses).
    losses[e] is the loss at the start of epoch e (before the step),
    so len(losses) == epochs.
    """
    raise NotImplementedError


def evaluate(w, b, X, y):
    """Return {"mse": float, "r2": float} for the model on (X, y).

    r2 = 1 - SS_res / SS_tot, with SS_tot measured around mean(y).
    If SS_tot is 0, return r2 = 0.0.
    """
    raise NotImplementedError
