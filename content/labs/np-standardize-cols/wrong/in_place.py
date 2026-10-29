import numpy as np


def standardize_cols(X):
    X = np.asarray(X)
    X -= X.mean(axis=0).astype(X.dtype)
    sd = X.std(axis=0)
    X /= np.where(sd == 0, 1, sd)
    return X
