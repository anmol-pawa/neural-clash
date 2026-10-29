import numpy as np


def pairwise_dists(X, Y):
    X, Y = np.asarray(X, float), np.asarray(Y, float)
    return ((X[:, None, :] - Y[None, :, :]) ** 2).sum(-1)
