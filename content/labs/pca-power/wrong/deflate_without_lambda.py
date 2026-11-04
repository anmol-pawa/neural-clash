import numpy as np


def _sign(v):
    return v if v[np.argmax(np.abs(v))] >= 0 else -v


def power_iteration(A, iters=500):
    A = np.asarray(A, dtype=float)
    v = np.random.default_rng(0).normal(size=A.shape[0])
    v /= np.linalg.norm(v)
    for _ in range(iters):
        w = A @ v
        n = np.linalg.norm(w)
        if n == 0.0:
            return 0.0, _sign(v)
        v = w / n
    return float(v @ A @ v), _sign(v)


def deflate(A, lam, v):
    return np.asarray(A, dtype=float) - np.outer(v, v)


def top_k_eigs(A, k, iters=500):
    M = np.asarray(A, dtype=float)
    values, vectors = [], []
    for _ in range(k):
        lam, v = power_iteration(M, iters)
        values.append(lam)
        vectors.append(v)
        M = deflate(M, lam, v)
    return np.array(values), np.array(vectors)


def pca_power(X, k):
    X = np.asarray(X, dtype=float)
    mean = X.mean(axis=0)
    Xc = X - mean
    values, vectors = top_k_eigs(Xc.T @ Xc / (X.shape[0] - 1), k)
    return mean, vectors, values
