import numpy as np
from nc_test import assert_close


def test_ols_recovers_a_line():
    w, b = ols_fit(np.array([[0.0], [1.0], [2.0]]), np.array([1.0, 3.0, 5.0]))
    assert_close(w, [2.0])
    assert_close(b, 1.0)


def test_sigmoid_at_zero():
    assert_close(sigmoid(np.array([0.0])), [0.5])


def test_loss_at_zero_weights_is_ln2():
    X = np.array([[1.0, 2.0], [3.0, 4.0]])
    loss, gw, gb = logistic_loss_grad(np.zeros(2), 0.0, X, np.array([0, 1]))
    assert_close(loss, np.log(2))
    assert gw.shape == (2,), f"grad_w should have shape (2,), got {gw.shape}"


def test_ridge_with_zero_lambda_is_ols():
    X = np.array([[0.0], [1.0], [2.0], [3.0]])
    y = np.array([1.0, 2.0, 2.0, 4.0])
    assert_close(ridge_fit(X, y, 0.0)[0], ols_fit(X, y)[0])
