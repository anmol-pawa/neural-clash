import numpy as np


def cosine_sim(X):
    X = np.asarray(X, float)
    n = len(X)
    S = np.zeros((n, n))
    for i in range(n):
        for j in range(n):
            d = np.linalg.norm(X[i]) * np.linalg.norm(X[j])
            S[i, j] = X[i] @ X[j] / d if d else 0.0
    return S
