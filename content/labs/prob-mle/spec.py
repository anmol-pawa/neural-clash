"""Starter file shown to the player. Fill in the five functions."""
import numpy as np


def gaussian_mle(x):
    """Return (mu, sigma2): the maximum-likelihood mean and variance of 1-D data x under a Gaussian model."""
    raise NotImplementedError


def gaussian_nll(x, mu, sigma):
    """Negative log-likelihood (a float) of data x under Normal(mu, sigma**2), summed over all points."""
    raise NotImplementedError


def bernoulli_map(x, a, b):
    """MAP estimate of p for 0/1 data x under a Beta(a, b) prior (a, b > 1): the mode of the posterior."""
    raise NotImplementedError


def bootstrap_means(x, idx):
    """Return the mean of each bootstrap resample.

    x is a 1-D data array of length n; idx is an int array of shape (B, n) holding the row indices
    that make up each of the B resamples. Return an array of shape (B,).
    """
    raise NotImplementedError


def percentile_ci(stats, alpha):
    """Two-sided percentile interval with coverage 1 - alpha for an array of bootstrap statistics.

    Return (low, high). Do not modify `stats`.
    """
    raise NotImplementedError
