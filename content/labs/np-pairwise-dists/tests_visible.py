import numpy as np
from nc_test import assert_close, python_lines


def test_small_example():
    X = np.array([[0.0, 0.0], [3.0, 4.0]])
    Y = np.array([[0.0, 0.0], [6.0, 8.0], [3.0, 0.0]])
    assert_close(pairwise_dists(X, Y), [[0, 10, 3], [5, 5, 4]])


def test_shape():
    rng = np.random.default_rng(0)
    assert pairwise_dists(rng.normal(size=(4, 3)), rng.normal(size=(6, 3))).shape == (4, 6)

def _vectorised(fn, *args, limit=40):
    out, lines = python_lines(fn, *args)
    assert lines <= limit, f"{lines} Python lines executed: the work is happening in a Python loop, not in numpy"
    return out
