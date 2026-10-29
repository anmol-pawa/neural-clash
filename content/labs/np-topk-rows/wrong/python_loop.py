import numpy as np


def topk_rows(S, k):
    S = np.asarray(S, float)
    return np.array([np.argsort(-row, kind="stable")[:k] for row in S])
