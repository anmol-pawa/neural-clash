import numpy as np
from nc_test import assert_close


def test_diagonal_matrix():
    lam, v = power_iteration(np.diag([5.0, 2.0, 1.0]))
    assert_close(lam, 5.0, rtol=1e-6)
    assert_close(v, [1.0, 0.0, 0.0], atol=1e-6)


def test_deflate_removes_direction():
    A = np.diag([5.0, 2.0])
    B = deflate(A, 5.0, np.array([1.0, 0.0]))
    assert_close(B, np.diag([0.0, 2.0]))
    assert_close(A, np.diag([5.0, 2.0]))
