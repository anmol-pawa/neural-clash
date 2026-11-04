"""Starter file shown to the player. Fill in the four functions.

All randomness is passed in as arrays of uniforms on [0, 1), so your code is deterministic and testable.
"""
import numpy as np


def exp_inverse_cdf(u, rate):
    """Map uniforms u in [0, 1) to Exponential(rate) draws by inverting F(x) = 1 - exp(-rate * x)."""
    raise NotImplementedError


def sample_categorical(probs, u):
    """Return, for each uniform in u, the index of the category it falls in.

    probs sums to 1. Category i owns the interval [cum[i-1], cum[i]) of [0, 1), with cum[-1] = 0.
    Return an int array with the shape of u, every entry in 0..len(probs)-1.
    """
    raise NotImplementedError


def rejection_sample(f, M, xs, us):
    """Rejection sampling with a Uniform(0, 1) proposal.

    f is a density on [0, 1] (a vectorised function) with f(x) <= M everywhere.
    xs are proposals drawn from Uniform(0, 1); us are independent uniforms.
    Keep the proposals x where us * M <= f(x), in their original order. Return them as a 1-D array.
    """
    raise NotImplementedError


def box_muller(u1, u2):
    """Turn two arrays of uniforms in (0, 1] into two arrays of independent standard normals (z1, z2)."""
    raise NotImplementedError
