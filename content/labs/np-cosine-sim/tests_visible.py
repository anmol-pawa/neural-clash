import numpy as np
from nc_test import assert_close, python_lines


def test_orthogonal_and_parallel():
    S = cosine_sim([[1.0, 0.0], [0.0, 2.0], [3.0, 0.0]])
    assert_close(S, [[1, 0, 1], [0, 1, 0], [1, 0, 1]])


def test_opposite():
    assert_close(cosine_sim([[1.0, 1.0], [-2.0, -2.0]])[0, 1], -1.0)

def _vectorised(fn, *args, limit=40):
    out, lines = python_lines(fn, *args)
    assert lines <= limit, f"{lines} Python lines executed: the work is happening in a Python loop, not in numpy"
    return out
