"""Starter file shown to the player."""
import numpy as np


def pca_fit(X, k):
    """Return (mean, components, variances): mean (d,), components (k, d) with the sign rule applied, variances (k,) using n - 1."""
    raise NotImplementedError


def pca_transform(X, mean, components):
    """Return the (n, k) scores of X in the principal basis."""
    raise NotImplementedError


def pca_inverse(Z, mean, components):
    """Map (n, k) scores back to (n, d) points."""
    raise NotImplementedError


def explained_ratio(X, variances):
    """Return variances divided by the total variance of X (sum over all d directions, n - 1)."""
    raise NotImplementedError
