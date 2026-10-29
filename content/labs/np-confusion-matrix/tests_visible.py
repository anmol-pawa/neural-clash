import numpy as np
from nc_test import assert_close, python_lines


def test_small_example():
    C = confusion_matrix([0, 0, 1, 1, 2], [0, 1, 1, 1, 0], 3)
    assert (C == [[1, 1, 0], [0, 2, 0], [1, 0, 0]]).all()


def test_total_is_sample_count():
    assert confusion_matrix([0, 1, 1], [1, 1, 0], 2).sum() == 3

def _vectorised(fn, *args, limit=40):
    out, lines = python_lines(fn, *args)
    assert lines <= limit, f"{lines} Python lines executed: the work is happening in a Python loop, not in numpy"
    return out
