"""Starter file shown to the player. Fill in the five functions."""
import numpy as np


def ols_fit(X, y):
    """Ordinary least squares via the normal equations. X is (n, d), y is (n,).

    Fit an intercept too. Return (w, b): w has shape (d,), b is a float.
    """
    raise NotImplementedError


def ridge_fit(X, y, lam):
    """Ridge regression: minimise sum of squared errors + lam * ||w||^2 (the intercept is not penalised).

    Return (w, b) like ols_fit.
    """
    raise NotImplementedError


def sigmoid(z):
    """Logistic function, elementwise, without overflow warnings for large |z|."""
    raise NotImplementedError


def logistic_loss_grad(w, b, X, y, lam=0.0):
    """Mean binary cross-entropy of p = sigmoid(X @ w + b) against 0/1 labels y, plus (lam / 2) * ||w||^2.

    Return (loss, grad_w, grad_b). Must stay finite for very confident wrong predictions.
    """
    raise NotImplementedError


def logistic_fit(X, y, lr, steps, lam=0.0):
    """Batch gradient descent from w = 0, b = 0 for `steps` steps. Return (w, b)."""
    raise NotImplementedError
