import numpy as np


def confusion_matrix(y_true, y_pred, k):
    C = np.zeros((k, k), dtype=int)
    for a, b in zip(y_true, y_pred):
        C[a, b] += 1
    return C
