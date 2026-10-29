import numpy as np
from nc_test import assert_close, python_lines


def test_repeated_pairs_are_counted():
    C = confusion_matrix([1] * 7, [0] * 7, 2)
    assert C[1, 0] == 7, "repeated (true, pred) pairs must all be counted"


def test_matches_counting_loop():
    rng = np.random.default_rng(17)
    t, p = rng.integers(0, 5, 500), rng.integers(0, 5, 500)
    ref = np.zeros((5, 5), dtype=int)
    for a, b in zip(t, p):
        ref[a, b] += 1
    assert (confusion_matrix(t, p, 5) == ref).all()


def test_missing_classes_keep_shape():
    assert confusion_matrix([0], [0], 4).shape == (4, 4)


def test_empty_input():
    assert (confusion_matrix([], [], 3) == np.zeros((3, 3), dtype=int)).all()


def test_integer_result_and_row_sums_are_class_supports():
    t = np.array([0, 0, 1, 2, 2, 2])
    C = confusion_matrix(t, [1, 0, 1, 2, 0, 2], 3)
    assert C.dtype.kind == "i"
    assert (C.sum(axis=1) == np.bincount(t, minlength=3)).all()


def test_no_python_loop():
    rng = np.random.default_rng(18)
    t, p = rng.integers(0, 10, 100_000), rng.integers(0, 10, 100_000)
    assert _vectorised(confusion_matrix, t, p, 10).sum() == 100_000

def _vectorised(fn, *args, limit=40):
    out, lines = python_lines(fn, *args)
    assert lines <= limit, f"{lines} Python lines executed: the work is happening in a Python loop, not in numpy"
    return out
