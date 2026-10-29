import numpy as np
from nc_test import assert_close, python_lines


def test_mean_zero_std_one():
    X = np.random.default_rng(5).normal(5.0, 3.0, size=(100, 4))
    out = standardize_cols(X)
    assert_close(out.mean(axis=0), np.zeros(4), atol=1e-9)
    assert_close(out.std(axis=0), np.ones(4))


def test_constant_column_is_zero_not_nan():
    out = standardize_cols([[2.0, 1.0], [2.0, 2.0], [2.0, 3.0]])
    assert np.isfinite(out).all(), "constant column divided by zero"
    assert_close(out[:, 0], [0.0, 0.0, 0.0])


def test_input_not_modified():
    X = np.array([[1.0, 2.0], [3.0, 4.0]])
    before = X.copy()
    standardize_cols(X)
    assert_close(X, before)


def test_integer_input():
    assert_close(standardize_cols([[1, 2], [3, 4]]), [[-1, -1], [1, 1]])


def test_no_python_loop():
    X = np.random.default_rng(6).normal(size=(3000, 20))
    assert _vectorised(standardize_cols, X).shape == (3000, 20)

def _vectorised(fn, *args, limit=40):
    out, lines = python_lines(fn, *args)
    assert lines <= limit, f"{lines} Python lines executed: the work is happening in a Python loop, not in numpy"
    return out
