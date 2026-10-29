import numpy as np


def one_hot(labels, k):
    labels = np.asarray(labels, dtype=np.int64)
    out = np.zeros((labels.size, labels.max() + 1 if labels.size else 0))
    out[np.arange(labels.size), labels] = 1.0
    return out
