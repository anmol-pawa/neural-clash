import numpy as np


def confusion_matrix(y_true, y_pred, k):
    C = np.zeros((k, k), dtype=int)
    C[np.asarray(y_true), np.asarray(y_pred)] += 1
    return C
