import numpy as np
from nc_test import assert_close, python_lines


def test_matches_full_argsort():
    S = np.random.default_rng(13).normal(size=(30, 12))
    for k in (1, 3, 12):
        assert (topk_rows(S, k) == np.argsort(-S, axis=1, kind="stable")[:, :k]).all()


def test_wide_rows_come_out_ordered():
    S = np.random.default_rng(19).normal(size=(40, 300))
    out = topk_rows(S, 10)
    got = np.take_along_axis(S, out, axis=1)
    assert (np.diff(got, axis=1) <= 0).all(), "indices must be ordered from largest score to smallest"
    assert (out == np.argsort(-S, axis=1, kind="stable")[:, :10]).all()


def test_ties_break_to_lower_index():
    S = np.array([[1.0, 5.0, 5.0, 5.0, 0.0]])
    assert (topk_rows(S, 2) == [[1, 2]]).all()
    assert (topk_rows(S, 4) == [[1, 2, 3, 0]]).all()


def test_returns_largest_not_smallest():
    S = np.array([[10.0, -10.0, 0.0]])
    assert topk_rows(S, 1)[0, 0] == 0


def test_output_shape_and_integer_dtype():
    out = topk_rows(np.zeros((4, 9)), 3)
    assert out.shape == (4, 3) and out.dtype.kind == "i"


def test_no_python_loop():
    S = np.random.default_rng(14).normal(size=(2000, 50))
    out = _vectorised(topk_rows, S, 5)
    assert (out == np.argsort(-S, axis=1, kind="stable")[:, :5]).all()

def _vectorised(fn, *args, limit=40):
    out, lines = python_lines(fn, *args)
    assert lines <= limit, f"{lines} Python lines executed: the work is happening in a Python loop, not in numpy"
    return out
