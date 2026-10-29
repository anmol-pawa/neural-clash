import numpy as np


def cosine_sim(X):
    X = np.asarray(X, float)
    U = X / np.linalg.norm(X, axis=1, keepdims=True)
    return U @ U.T
