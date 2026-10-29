import numpy as np
from nc_test import assert_close, python_lines


def test_rows_sum_to_one_and_match_reference():
    rng = np.random.default_rng(3)
    Z = rng.normal(size=(6, 5)) * 3
    ref = np.exp(Z) / np.exp(Z).sum(axis=1)[:, None]
    assert_close(softmax_rows(Z), ref)
    assert_close(softmax_rows(Z).sum(axis=1), np.ones(6))


def test_large_logits_do_not_overflow():
    out = softmax_rows([[1000.0, 1001.0], [-1000.0, -1001.0]])
    assert np.isfinite(out).all(), "exp overflowed; subtract the row max"
    assert_close(out, [[1 / (1 + np.e), np.e / (1 + np.e)], [np.e / (1 + np.e), 1 / (1 + np.e)]])


def test_row_normalisation_axis():
    Z = np.array([[1.0, 2.0, 3.0], [1.0, 2.0, 3.0]])
    assert_close(softmax_rows(Z)[0], softmax_rows(Z)[1])
    assert_close(softmax_rows(Z).sum(axis=1), [1.0, 1.0])


def test_single_column_is_all_ones():
    assert_close(softmax_rows([[5.0], [-7.0]]), [[1.0], [1.0]])


def test_no_python_loop():
    Z = np.random.default_rng(4).normal(size=(2000, 30))
    assert _vectorised(softmax_rows, Z).shape == (2000, 30)

def _vectorised(fn, *args, limit=40):
    out, lines = python_lines(fn, *args)
    assert lines <= limit, f"{lines} Python lines executed: the work is happening in a Python loop, not in numpy"
    return out
