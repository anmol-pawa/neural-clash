import numpy as np


def pairwise_dists(X, Y):
    X, Y = np.asarray(X, float), np.asarray(Y, float)
    D = np.zeros((len(X), len(Y)))
    for i in range(len(X)):
        for j in range(len(Y)):
            D[i, j] = np.sqrt(((X[i] - Y[j]) ** 2).sum())
    return D
