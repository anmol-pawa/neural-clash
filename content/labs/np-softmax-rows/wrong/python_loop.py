import numpy as np


def softmax_rows(Z):
    Z = np.asarray(Z, float)
    out = np.empty_like(Z)
    for i in range(len(Z)):
        e = np.exp(Z[i] - Z[i].max())
        out[i] = e / e.sum()
    return out
