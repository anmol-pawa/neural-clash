import numpy as np


def cosine_sim(X):
    X = np.asarray(X, float)
    return X @ X.T
