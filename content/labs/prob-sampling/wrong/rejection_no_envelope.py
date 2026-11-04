import numpy as np


def exp_inverse_cdf(u, rate):
    u = np.asarray(u, dtype=float)
    return -np.log1p(-u) / rate


def sample_categorical(probs, u):
    cum = np.cumsum(probs)
    idx = np.searchsorted(cum, np.asarray(u, dtype=float), side="right")
    return np.minimum(idx, len(probs) - 1)


def rejection_sample(f, M, xs, us):
    xs = np.asarray(xs, dtype=float)
    keep = np.asarray(us, dtype=float) <= f(xs)
    return xs[keep]


def box_muller(u1, u2):
    r = np.sqrt(-2.0 * np.log(np.asarray(u1, dtype=float)))
    theta = 2.0 * np.pi * np.asarray(u2, dtype=float)
    return r * np.cos(theta), r * np.sin(theta)
