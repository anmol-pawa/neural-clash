import numpy as np


def topk_rows(S, k):
    S = np.asarray(S, float)
    return np.argsort(S, axis=1, kind="stable")[:, :k]
