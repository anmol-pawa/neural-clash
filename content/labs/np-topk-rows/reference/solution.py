import numpy as np


def topk_rows(S, k):
    S = np.asarray(S, float)
    # a stable sort of the negated scores keeps equal scores in index order
    return np.argsort(-S, axis=1, kind="stable")[:, :k]
