import numpy as np
from nc_test import assert_close, python_lines


def test_uniform_row():
    assert_close(softmax_rows([[1.0, 1.0, 1.0, 1.0]]), [[0.25] * 4])


def test_known_values():
    assert_close(softmax_rows([[0.0, np.log(3.0)]]), [[0.25, 0.75]])

def _vectorised(fn, *args, limit=40):
    out, lines = python_lines(fn, *args)
    assert lines <= limit, f"{lines} Python lines executed: the work is happening in a Python loop, not in numpy"
    return out
