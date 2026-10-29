import numpy as np


def standardize_cols(X):
    X = np.asarray(X, float)
    out = np.zeros_like(X)
    for j in range(X.shape[1]):
        sd = X[:, j].std()
        out[:, j] = (X[:, j] - X[:, j].mean()) / (sd if sd else 1.0)
    return out
