import numpy as np


def fit_linear(X, y, lr=0.1, epochs=200):
    n, d = X.shape
    w = np.zeros(d)
    b = 0.0
    losses = []
    for _ in range(epochs):
        r = X @ w + b - y
        losses.append(float(np.mean(r ** 2)))
        w = w - lr * (2.0 / n) * (X.T @ r)
        b = b - lr * (2.0 / n) * float(np.sum(r))
    return w, b, losses


def evaluate(w, b, X, y):
    r = X @ w + b - y
    ss_res = float(np.sum(r ** 2))
    ss_tot = float(np.sum((y - np.mean(y)) ** 2))
    r2 = 0.0 if ss_tot == 0.0 else 1.0 - ss_res / ss_tot
    return {"mse": float(np.mean(r ** 2)), "r2": r2}
