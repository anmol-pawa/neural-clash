import numpy as np


def one_hot(labels, k):
    labels = np.asarray(labels, dtype=np.int64)
    if labels.size and (labels.min() < 0 or labels.max() >= k):
        raise ValueError("label out of range")
    out = np.zeros((labels.size, k))
    for i, c in enumerate(labels):
        out[i, c] = 1.0
    return out
