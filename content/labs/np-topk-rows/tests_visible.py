import numpy as np
from nc_test import assert_close, python_lines


def test_simple():
    S = np.array([[0.1, 0.9, 0.5], [3.0, 1.0, 2.0]])
    assert (topk_rows(S, 2) == [[1, 2], [0, 2]]).all()


def test_k_equals_width_is_full_sort():
    S = np.array([[2.0, 3.0, 1.0]])
    assert (topk_rows(S, 3) == [[1, 0, 2]]).all()

def _vectorised(fn, *args, limit=40):
    out, lines = python_lines(fn, *args)
    assert lines <= limit, f"{lines} Python lines executed: the work is happening in a Python loop, not in numpy"
    return out
