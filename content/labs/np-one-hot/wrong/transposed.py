import numpy as np


def one_hot(labels, k):
    labels = np.asarray(labels, dtype=np.int64)
    if labels.size and (labels.min() < 0 or labels.max() >= k):
        raise ValueError("label out of range")
    out = np.zeros((k, labels.size))
    out[labels, np.arange(labels.size)] = 1.0
    return out
