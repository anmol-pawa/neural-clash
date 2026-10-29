import numpy as np
from nc_test import assert_close, python_lines


def test_basic():
    assert_close(one_hot([0, 2, 1], 3), [[1, 0, 0], [0, 0, 1], [0, 1, 0]])


def test_empty():
    assert one_hot([], 4).shape == (0, 4)

def _vectorised(fn, *args, limit=40):
    out, lines = python_lines(fn, *args)
    assert lines <= limit, f"{lines} Python lines executed: the work is happening in a Python loop, not in numpy"
    return out
