"""Starter file shown to the player. Fill in the four functions."""
import numpy as np


def prf(y_true, y_pred, beta=1.0):
    """Precision, recall and F-beta for binary labels (1 = positive).

    Return (precision, recall, f_beta). Any ratio whose denominator is zero is 0.0 (never NaN).
    F-beta = (1 + beta^2) * p * r / (beta^2 * p + r); beta > 1 weights recall more.
    """
    raise NotImplementedError


def roc_auc(scores, y):
    """ROC-AUC as the probability that a random positive outscores a random negative.

    A tie between a positive and a negative counts one half. Return 0.5 if either class is absent.
    """
    raise NotImplementedError


def average_precision(scores, y):
    """Average precision (the usual PR-AUC): sum over thresholds of (recall step) * precision.

    Rank by descending score. Items with the same score share a threshold: you cannot cut between them.
    Return 0.0 if there are no positives.
    """
    raise NotImplementedError


def best_threshold(scores, y, cost_fp, cost_fn):
    """Pick the cut-off with the lowest total cost. Flag an item when score >= t.

    Each false positive costs cost_fp and each false negative cost_fn. Candidates are the distinct scores,
    plus t = np.inf (flag nothing). Return (t, total_cost); on a cost tie keep the HIGHER threshold.
    """
    raise NotImplementedError
