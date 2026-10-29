import numpy as np


def pairwise_dists(X, Y):
    X, Y = np.asarray(X, float), np.asarray(Y, float)
    k = min(len(X), len(Y))
    return np.sqrt(((X[:k] - Y[:k]) ** 2).sum(-1))
