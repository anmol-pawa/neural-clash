import numpy as np


def cosine_sim(X):
    X = np.asarray(X, float)
    norms = np.linalg.norm(X, axis=0, keepdims=True)
    U = X / np.where(norms == 0.0, 1.0, norms)
    return U @ U.T
