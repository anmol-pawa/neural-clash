import numpy as np


def topk_rows(S, k):
    S = np.asarray(S, float)
    # ascending stable sort reversed: ties come out highest index first
    return np.argsort(S, axis=1, kind="stable")[:, ::-1][:, :k]
