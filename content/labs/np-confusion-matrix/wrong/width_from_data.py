import numpy as np


def confusion_matrix(y_true, y_pred, k):
    t = np.asarray(y_true, dtype=np.int64)
    p = np.asarray(y_pred, dtype=np.int64)
    m = int(max(t.max(), p.max())) + 1 if t.size else 0
    return np.bincount(t * m + p, minlength=m * m).reshape(m, m)
