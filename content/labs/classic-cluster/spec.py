"""Starter file shown to the player. Fill in the five functions."""
import numpy as np


def zscore(X_train, X_test):
    """Standardise columns using the TRAINING mean and population std (ddof=0) only.

    Return (train_scaled, test_scaled). A column with zero std is left centred (divide by 1).
    """
    raise NotImplementedError


def knn_predict(X_train, y_train, X_test, k):
    """k-nearest-neighbour classification with Euclidean distance.

    Majority vote among the k closest training points. Break distance ties by the lower training index
    (a stable sort) and vote ties by the smaller label. Return an int array of shape (len(X_test),).
    """
    raise NotImplementedError


def kmeans(X, centers, iters):
    """Lloyd's k-means from the given initial centers (k, d), for exactly `iters` rounds.

    Each round: assign every point to its nearest center (lowest index wins ties), then move each center
    to the mean of its points. A center with no points keeps its old position.
    Return (centers, labels) where labels come from the final assignment step.
    """
    raise NotImplementedError


def gini(y):
    """Gini impurity 1 - sum(p_c^2) of an integer label array. An empty array has impurity 0."""
    raise NotImplementedError


def best_split(x, y):
    """Best threshold for a one-feature decision stump, by weighted Gini decrease.

    Candidate thresholds are midpoints between consecutive distinct sorted values of x. The left child is
    x <= t. Return (threshold, gain) for the largest gain; on a tie take the smallest threshold.
    If x has a single distinct value return (None, 0.0).
    """
    raise NotImplementedError
