import numpy as np
from nc_test import assert_close, python_lines


def test_two_columns():
    out = standardize_cols([[1.0, 10.0], [3.0, 10.0], [5.0, 40.0]])
    assert_close(out[:, 0], [-np.sqrt(1.5), 0.0, np.sqrt(1.5)])


def test_shape_kept():
    assert standardize_cols(np.arange(12.0).reshape(4, 3)).shape == (4, 3)

def _vectorised(fn, *args, limit=40):
    out, lines = python_lines(fn, *args)
    assert lines <= limit, f"{lines} Python lines executed: the work is happening in a Python loop, not in numpy"
    return out
