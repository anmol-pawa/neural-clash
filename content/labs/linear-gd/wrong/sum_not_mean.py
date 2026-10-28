import numpy as np


def mse_loss_grad(w, X, y):
    r = X @ w - y
    n = X.shape[0]
    loss = float(np.mean(r ** 2))
    grad = 2.0 * (X.T @ r)
    return loss, grad


def gd_step(w, grad, lr):
    return w - lr * grad
