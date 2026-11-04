import numpy as np


def gaussian_mle(x):
    x = np.asarray(x, dtype=float)
    mu = float(x.mean())
    return mu, float(np.sum((x - mu) ** 2) / (x.size - 1))


def gaussian_nll(x, mu, sigma):
    x = np.asarray(x, dtype=float)
    n = x.size
    return float(n * np.log(sigma) + 0.5 * n * np.log(2 * np.pi) + np.sum((x - mu) ** 2) / (2 * sigma ** 2))


def bernoulli_map(x, a, b):
    x = np.asarray(x)
    k, n = float(x.sum()), x.size
    return (k + a - 1) / (n + a + b - 2)


def bootstrap_means(x, idx):
    return np.asarray(x, dtype=float)[idx].mean(axis=1)


def percentile_ci(stats, alpha):
    lo, hi = np.percentile(stats, [100 * alpha / 2, 100 * (1 - alpha / 2)])
    return float(lo), float(hi)
