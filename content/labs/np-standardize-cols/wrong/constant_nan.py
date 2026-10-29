import numpy as np


def standardize_cols(X):
    X = np.asarray(X, float)
    return (X - X.mean(axis=0)) / X.std(axis=0)
