import numpy as np
from nc_test import assert_close, python_lines


def test_matches_pairwise_formula():
    X = np.random.default_rng(9).normal(size=(8, 5))
    ref = np.array([[a @ b / (np.linalg.norm(a) * np.linalg.norm(b)) for b in X] for a in X])
    assert_close(cosine_sim(X), ref)


def test_zero_row_gives_zero_not_nan():
    S = cosine_sim([[0.0, 0.0], [1.0, 2.0]])
    assert np.isfinite(S).all(), "zero row divided by zero"
    assert_close(S[0], [0.0, 0.0])
    assert_close(S[1, 1], 1.0)


def test_symmetric_with_unit_diagonal():
    X = np.random.default_rng(10).normal(size=(6, 3))
    S = cosine_sim(X)
    assert_close(S, S.T)
    assert_close(np.diag(S), np.ones(6))


def test_scale_invariant():
    X = np.random.default_rng(11).normal(size=(5, 4))
    assert_close(cosine_sim(X), cosine_sim(X * np.array([[1], [10], [0.1], [5], [100]])))


def test_no_python_loop():
    X = np.random.default_rng(12).normal(size=(400, 32))
    assert _vectorised(cosine_sim, X).shape == (400, 400)

def _vectorised(fn, *args, limit=40):
    out, lines = python_lines(fn, *args)
    assert lines <= limit, f"{lines} Python lines executed: the work is happening in a Python loop, not in numpy"
    return out
