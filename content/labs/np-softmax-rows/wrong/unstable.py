import numpy as np


def softmax_rows(Z):
    E = np.exp(np.asarray(Z, float))
    return E / E.sum(axis=1, keepdims=True)
