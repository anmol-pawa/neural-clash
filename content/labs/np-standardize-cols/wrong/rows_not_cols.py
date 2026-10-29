import numpy as np


def standardize_cols(X):
    X = np.asarray(X, float)
    sd = X.std(axis=1, keepdims=True)
    sd = np.where(sd == 0.0, 1.0, sd)
    return (X - X.mean(axis=1, keepdims=True)) / sd
