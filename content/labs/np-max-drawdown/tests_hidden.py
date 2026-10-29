import numpy as np
from nc_test import assert_close, python_lines


def test_recovery_then_deeper_fall():
    assert_close(max_drawdown([10.0, 5.0, 20.0, 18.0, 9.0]), 0.55)


def test_rise_after_low_is_not_a_drawdown():
    assert_close(max_drawdown([5.0, 10.0]), 0.0)


def test_empty_and_single():
    assert max_drawdown([]) == 0.0
    assert max_drawdown([7.0]) == 0.0


def test_matches_brute_force():
    p = np.random.default_rng(15).uniform(1, 100, size=60)
    best = 0.0
    for i in range(len(p)):
        for j in range(i, len(p)):
            best = max(best, (p[i] - p[j]) / p[i])
    assert_close(max_drawdown(p), best)


def test_linear_time_no_python_loop():
    p = np.random.default_rng(16).uniform(1, 100, size=200_000)
    out = _vectorised(max_drawdown, p)
    assert 0.0 <= out < 1.0

def _vectorised(fn, *args, limit=40):
    out, lines = python_lines(fn, *args)
    assert lines <= limit, f"{lines} Python lines executed: the work is happening in a Python loop, not in numpy"
    return out
