import numpy as np


def confusion_matrix(y_true, y_pred, k):
    t = np.asarray(y_true, dtype=np.int64)
    p = np.asarray(y_pred, dtype=np.int64)
    return np.bincount(p * k + t, minlength=k * k).reshape(k, k)
