"""Starter file shown to the player. Fill in the six functions."""
import numpy as np


def normal_equation(X, y):
    """Least squares with an intercept. X is (n, d), y is (n,). Return (w, b) with w of shape (d,).

    Solve the normal equations on the design matrix [X, 1] (use np.linalg.solve, not an explicit inverse).
    """
    raise NotImplementedError


def ridge_fit(X, y, lam):
    """Ridge regression minimising sum((y - Xw - b)^2) + lam * sum(w^2). The intercept b is NOT penalised.

    Return (w, b).
    """
    raise NotImplementedError


def sigmoid(z):
    """Logistic function, elementwise, that never overflows (z can be +-1000)."""
    raise NotImplementedError


def logistic_loss(X, y, w, b):
    """Mean binary cross-entropy of the model p = sigmoid(Xw + b) on labels y in {0, 1}.

    It must stay finite for huge logits (do not take log of a probability that rounded to 0 or 1).
    """
    raise NotImplementedError


def logistic_grad(X, y, w, b):
    """Gradient of logistic_loss with respect to (w, b). Return (grad_w, grad_b)."""
    raise NotImplementedError


def logistic_gd(X, y, lr, steps):
    """Full-batch gradient descent from w = 0, b = 0 for `steps` steps. Return (w, b)."""
    raise NotImplementedError
