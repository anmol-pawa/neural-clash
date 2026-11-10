"""Starter file shown to the player. Fill in the five functions."""
import numpy as np


def precision_at_k(rel, k):
    """Fraction of the top k results that are relevant. `rel` is graded relevance in ranked order
    (rank 1 first); any value > 0 counts as relevant. Divide by k even if fewer than k results exist."""
    raise NotImplementedError


def recall_at_k(rel, k, n_relevant):
    """Fraction of ALL relevant items (n_relevant, known from the corpus) found in the top k.
    Return 0.0 if n_relevant is 0."""
    raise NotImplementedError


def mrr(rel_lists):
    """Mean reciprocal rank over queries. Each element is one query's ranked relevance list.
    A query's score is 1 / (rank of its first relevant result), or 0 if it has none."""
    raise NotImplementedError


def ndcg_at_k(rel, k):
    """Normalised DCG at k with gain 2^g - 1 and discount log2(rank + 1) (rank is 1-based).

    The ideal ordering sorts the WHOLE `rel` list by relevance, descending, then takes its top k.
    Return 0.0 when the ideal DCG is 0.
    """
    raise NotImplementedError


def ece(probs, y, bins=10):
    """Expected calibration error with equal-width bins on [0, 1].

    Bin b holds probs in [b/bins, (b+1)/bins); probability 1.0 goes in the last bin. Sum over non-empty
    bins of (bin size / n) * |mean(y) - mean(probs)|.
    """
    raise NotImplementedError
