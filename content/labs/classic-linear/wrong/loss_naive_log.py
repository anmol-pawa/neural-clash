import numpy as np


def _augment(X):
    X = np.asarray(X, dtype=float)
    return np.hstack([X, np.ones((X.shape[0], 1))])


def ols_fit(X, y):
    A = _augment(X)
    theta = np.linalg.solve(A.T @ A, A.T @ np.asarray(y, dtype=float))
    return theta[:-1], float(theta[-1])


def ridge_fit(X, y, lam):
    A = _augment(X)
    penalty = lam * np.eye(A.shape[1])
    penalty[-1, -1] = 0.0  # never shrink the intercept
    theta = np.linalg.solve(A.T @ A + penalty, A.T @ np.asarray(y, dtype=float))
    return theta[:-1], float(theta[-1])


def sigmoid(z):
    z = np.asarray(z, dtype=float)
    out = np.empty_like(z)
    pos = z >= 0
    out[pos] = 1.0 / (1.0 + np.exp(-z[pos]))
    e = np.exp(z[~pos])
    out[~pos] = e / (1.0 + e)
    return out


def logistic_loss_grad(w, b, X, y, lam=0.0):
    X, y = np.asarray(X, dtype=float), np.asarray(y, dtype=float)
    n = X.shape[0]
    z = X @ w + b
    p = 1.0 / (1.0 + np.exp(-z))
    loss = -np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)) + 0.5 * lam * np.sum(w ** 2)
    r = p - y
    return float(loss), X.T @ r / n + lam * w, float(r.mean())


def logistic_fit(X, y, lr, steps, lam=0.0):
    X = np.asarray(X, dtype=float)
    w, b = np.zeros(X.shape[1]), 0.0
    for _ in range(steps):
        _, gw, gb = logistic_loss_grad(w, b, X, y, lam)
        w = w - lr * gw
        b = b - lr * gb
    return w, b
