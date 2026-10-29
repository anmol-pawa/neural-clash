import numpy as np
from nc_test import assert_close, python_lines


def test_missing_classes_keep_width():
    out = one_hot([1, 1], 5)
    assert out.shape == (2, 5)
    assert_close(out.sum(axis=0), [0, 2, 0, 0, 0])


def test_out_of_range_raises():
    for bad in ([3], [-1], [0, 5]):
        try:
            one_hot(bad, 3)
        except ValueError:
            continue
        raise AssertionError(f"{bad} should raise ValueError (a negative label would silently wrap)")


def test_dtype_is_float_and_rows_sum_to_one():
    out = one_hot(np.array([4, 0, 0, 3]), 5)
    assert out.dtype.kind == "f"
    assert_close(out.sum(axis=1), np.ones(4))


def test_matches_identity_rows():
    labels = np.random.default_rng(7).integers(0, 6, size=40)
    assert_close(one_hot(labels, 6), np.eye(6)[labels])


def test_no_python_loop():
    labels = np.random.default_rng(8).integers(0, 10, size=5000)
    assert _vectorised(one_hot, labels, 10).shape == (5000, 10)

def _vectorised(fn, *args, limit=40):
    out, lines = python_lines(fn, *args)
    assert lines <= limit, f"{lines} Python lines executed: the work is happening in a Python loop, not in numpy"
    return out
