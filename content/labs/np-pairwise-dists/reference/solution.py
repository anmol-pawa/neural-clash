import numpy as np


def pairwise_dists(X, Y):
    X, Y = np.asarray(X, float), np.asarray(Y, float)
    sq = (X * X).sum(1)[:, None] + (Y * Y).sum(1)[None, :] - 2.0 * X @ Y.T
    return np.sqrt(np.maximum(sq, 0.0))
