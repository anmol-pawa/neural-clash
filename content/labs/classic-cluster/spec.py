"""Starter file shown to the player. Fill in the five functions."""
import numpy as np


def knn_predict(Xtr, ytr, Xte, k):
    """k-nearest-neighbour classifier with Euclidean distance. Xtr (n, d), ytr (n,) integer labels, Xte (m, d).

    Return an array of m predicted labels. Majority vote among the k nearest training points; on a tied
    vote choose the smallest label. When distances tie, the point that comes earlier in Xtr counts as nearer.
    """
    raise NotImplementedError


def kmeans_assign(X, centers):
    """Index of the nearest centre (squared Euclidean) for every row of X. Return an int array of shape (n,)."""
    raise NotImplementedError


def kmeans_update(X, assign, centers):
    """Move each centre to the mean of the points assigned to it. Return a new (k, d) array.

    A cluster with no points keeps its old centre. Do not modify `centers`.
    """
    raise NotImplementedError


def gini(y):
    """Gini impurity 1 - sum(p_c ** 2) of a label array. An empty array has impurity 0.0."""
    raise NotImplementedError


def best_split(x, y):
    """Best threshold on a single numeric feature x for labels y.

    Candidate thresholds are midpoints between consecutive distinct values of x. A split sends x <= t left.
    Return (threshold, gain) where gain = gini(y) - weighted child impurity. If no split reduces impurity
    return (None, 0.0). On ties keep the smallest threshold.
    """
    raise NotImplementedError
