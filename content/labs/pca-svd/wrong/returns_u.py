import numpy as np


def _fix_signs(V):
    V = np.array(V, dtype=float)
    idx = np.argmax(np.abs(V), axis=1)
    signs = np.sign(V[np.arange(V.shape[0]), idx])
    signs[signs == 0] = 1.0
    return V * signs[:, None]


def pca_fit(X, k):
    X = np.asarray(X, dtype=float)
    mean = X.mean(axis=0)
    U, s, Vt = np.linalg.svd(X - mean, full_matrices=False)
    variances = s[:k] ** 2 / (X.shape[0] - 1)
    return mean, _fix_signs(U[:, :k]), variances


def pca_transform(X, mean, components):
    return (np.asarray(X, dtype=float) - mean) @ components.T


def pca_inverse(Z, mean, components):
    return np.asarray(Z, dtype=float) @ components + mean


def explained_ratio(X, variances):
    X = np.asarray(X, dtype=float)
    total = np.var(X, axis=0, ddof=1).sum()
    return np.asarray(variances, dtype=float) / total
