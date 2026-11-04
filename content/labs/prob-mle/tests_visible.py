import numpy as np
from nc_test import assert_close


def test_mle_of_a_tiny_sample():
    mu, s2 = gaussian_mle([1.0, 3.0])
    assert_close(mu, 2.0)
    assert_close(s2, 1.0)


def test_map_with_a_flat_prior_is_the_sample_mean():
    assert_close(bernoulli_map([1, 0, 1, 1], 1, 1), 0.75)


def test_bootstrap_means_shape():
    out = bootstrap_means(np.array([1.0, 2.0, 3.0]), np.array([[0, 0, 0], [0, 1, 2]]))
    assert out.shape == (2,), f"expected (2,), got {out.shape}"


def test_ci_is_ordered():
    lo, hi = percentile_ci(np.arange(100.0), 0.1)
    assert lo < hi
