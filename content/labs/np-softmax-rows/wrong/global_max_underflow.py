import numpy as np


def softmax_rows(Z):
    Z = np.asarray(Z, float)
    E = np.exp(Z - Z.max())
    return E / E.sum(axis=1, keepdims=True)
