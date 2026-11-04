"""Starter file shown to the player."""
import numpy as np


def power_iteration(A, iters=500):
    """Return (eigenvalue, unit eigenvector) of the dominant eigenpair of symmetric PSD A; largest entry positive."""
    raise NotImplementedError


def deflate(A, lam, v):
    """Return A with the eigenpair (lam, v) removed. Do not modify A."""
    raise NotImplementedError


def top_k_eigs(A, k, iters=500):
    """Return (values (k,), vectors (k, d)) by repeated power iteration and deflation."""
    raise NotImplementedError


def pca_power(X, k):
    """Return (mean, components (k, d), variances (k,)) using the covariance matrix with n - 1."""
    raise NotImplementedError
