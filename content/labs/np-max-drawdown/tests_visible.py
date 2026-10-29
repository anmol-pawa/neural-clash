import numpy as np
from nc_test import assert_close, python_lines


def test_simple_fall():
    assert_close(max_drawdown([100.0, 120.0, 60.0, 90.0]), 0.5)


def test_monotone_increasing_is_zero():
    assert max_drawdown([1.0, 2.0, 3.0]) == 0.0

def _vectorised(fn, *args, limit=40):
    out, lines = python_lines(fn, *args)
    assert lines <= limit, f"{lines} Python lines executed: the work is happening in a Python loop, not in numpy"
    return out
