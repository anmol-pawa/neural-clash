import numpy as np
from nc_test import assert_close, python_lines


def _brute(X, Y):
    return np.array([[np.sqrt(((a - b) ** 2).sum()) for b in Y] for a in X])


def test_matches_brute_force_on_random_data():
    for seed in range(5):
        rng = np.random.default_rng(seed)
        X, Y = rng.normal(size=(7, 4)), rng.normal(size=(5, 4))
        assert_close(pairwise_dists(X, Y), _brute(X, Y), atol=1e-7)


def test_identical_points_give_zero_not_nan():
    rng = np.random.default_rng(1)
    X = rng.normal(size=(50, 16)) * 10 + 1e3
    D = pairwise_dists(X, X)
    assert not np.isnan(D).any(), "rounding made a squared distance negative; clip before sqrt"
    assert np.all(np.diag(D) < 1e-3)


def test_single_row_and_dimension_one():
    assert_close(pairwise_dists([[2.0]], [[5.0], [-1.0]]), [[3, 3]])


def test_no_python_loop_over_rows():
    rng = np.random.default_rng(2)
    X, Y = rng.normal(size=(300, 8)), rng.normal(size=(200, 8))
    D = _vectorised(pairwise_dists, X, Y)
    assert D.shape == (300, 200)

def _vectorised(fn, *args, limit=40):
    out, lines = python_lines(fn, *args)
    assert lines <= limit, f"{lines} Python lines executed: the work is happening in a Python loop, not in numpy"
    return out
