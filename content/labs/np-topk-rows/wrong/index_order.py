import numpy as np


def topk_rows(S, k):
    S = np.asarray(S, float)
    # the right set of columns, but listed by column index, not by score
    return np.sort(np.argpartition(-S, k - 1, axis=1)[:, :k], axis=1)
