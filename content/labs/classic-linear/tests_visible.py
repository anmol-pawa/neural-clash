import numpy as np
from nc_test import assert_close


def test_normal_equation_recovers_a_line():
    X = np.array([[0.0], [1.0], [2.0]])
    w, b = normal_equation(X, 2 * X[:, 0] + 1)
    assert_close(w, [2.0])
    assert_close(b, 1.0)


def test_sigmoid_of_zero():
    assert_close(sigmoid(np.array([0.0])), [0.5])


def test_loss_at_zero_is_log_two():
    X = np.array([[1.0], [-1.0]])
    assert_close(logistic_loss(X, np.array([1, 0]), np.zeros(1), 0.0), np.log(2))


def test_gd_returns_a_weight_vector():
    X = np.array([[-2.0], [-1.0], [1.0], [2.0]])
    w, b = logistic_gd(X, np.array([0, 0, 1, 1]), 0.5, 20)
    assert np.shape(w) == (1,)
    assert w[0] > 0
