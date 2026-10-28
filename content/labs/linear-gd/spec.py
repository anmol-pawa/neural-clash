"""Starter file shown to the player. Fill in the two functions."""
import numpy as np


def mse_loss_grad(w, X, y):
    """Return (loss, grad) for the model  y_hat = X @ w  with loss = mean((y_hat - y)**2).

    X: (N, D), w: (D,), y: (N,). grad has the same shape as w.
    """
    raise NotImplementedError


def gd_step(w, grad, lr):
    """Return the weights after one plain gradient-descent step."""
    raise NotImplementedError
