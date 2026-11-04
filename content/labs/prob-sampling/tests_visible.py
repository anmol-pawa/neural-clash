import numpy as np
from nc_test import assert_close


def test_exponential_at_known_points():
    assert_close(exp_inverse_cdf(np.array([0.0]), 2.0), [0.0])
    assert_close(exp_inverse_cdf(np.array([1 - np.exp(-1.0)]), 1.0), [1.0])


def test_categorical_picks_the_right_bucket():
    got = sample_categorical([0.5, 0.3, 0.2], np.array([0.1, 0.6, 0.95]))
    assert list(got) == [0, 1, 2], f"expected [0, 1, 2], got {list(got)}"


def test_rejection_keeps_a_subset():
    xs = np.array([0.1, 0.5, 0.9])
    out = rejection_sample(lambda x: 2 * x, 2.0, xs, np.array([0.5, 0.5, 0.5]))
    assert out.ndim == 1 and len(out) <= 3


def test_box_muller_returns_two_arrays_of_the_input_length():
    z1, z2 = box_muller(np.array([0.5, 0.25]), np.array([0.1, 0.2]))
    assert z1.shape == (2,) and z2.shape == (2,)
