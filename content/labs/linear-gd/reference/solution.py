import numpy as np


def mse_loss_grad(w, X, y):
    r = X @ w - y
    n = X.shape[0]
    loss = float(np.mean(r ** 2))
    grad = (2.0 / n) * (X.T @ r)
    return loss, grad


def gd_step(w, grad, lr):
    return w - lr * grad


def fit(X, y, lr, epochs):
    w = np.zeros(X.shape[1])
    history = []
    for _ in range(epochs):
        loss, grad = mse_loss_grad(w, X, y)
        history.append(loss)
        w = gd_step(w, grad, lr)
    return w, history


def r2_score(w, X, y):
    ss_res = float(np.sum((X @ w - y) ** 2))
    ss_tot = float(np.sum((y - np.mean(y)) ** 2))
    if ss_tot == 0.0:
        return 1.0 if ss_res == 0.0 else 0.0
    return 1.0 - ss_res / ss_tot
