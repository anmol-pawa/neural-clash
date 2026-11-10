import numpy as np


def _design(X):
    X = np.asarray(X, dtype=float)
    return np.hstack([X, np.ones((X.shape[0], 1))])


def normal_equation(X, y):
    A = _design(X)
    theta = np.linalg.solve(A.T @ A, A.T @ np.asarray(y, dtype=float))
    return theta[:-1], float(theta[-1])


def ridge_fit(X, y, lam):
    A = _design(X)
    P = lam * np.eye(A.shape[1])
    P[-1, -1] = 0.0  # never shrink the intercept
    theta = np.linalg.solve(A.T @ A + P, A.T @ np.asarray(y, dtype=float))
    return theta[:-1], float(theta[-1])


def sigmoid(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(-np.abs(z))
    return np.where(z >= 0, 1.0 / (1.0 + e), e / (1.0 + e))


def logistic_loss(X, y, w, b):
    z = np.asarray(X, dtype=float) @ w + b
    y = np.asarray(y, dtype=float)
    # -[y log s(z) + (1-y) log(1-s(z))] = log(1 + e^z) - y z
    return float(np.mean(np.logaddexp(0.0, z) - y * z))


def logistic_grad(X, y, w, b):
    X = np.asarray(X, dtype=float)
    r = sigmoid(X @ w + b) - np.asarray(y, dtype=float)
    return X.T @ r / X.shape[0], float(r.mean())


def logistic_gd(X, y, lr, steps):
    X = np.asarray(X, dtype=float)
    w, b = np.zeros(X.shape[1]), 0.0
    for _ in range(steps):
        gw, gb = logistic_grad(X, y, w, b)
        w = w - lr * gw
        b = b - lr * gb
    return w, b
