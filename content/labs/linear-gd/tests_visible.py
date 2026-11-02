import numpy as np
from nc_test import assert_close


def test_loss_on_a_perfect_fit_is_zero():
    X = np.array([[1.0, 0.0], [0.0, 1.0]])
    w = np.array([2.0, -1.0])
    loss, grad = mse_loss_grad(w, X, X @ w)
    assert_close(loss, 0.0)
    assert_close(grad, [0.0, 0.0])


def test_gradient_has_the_shape_of_w():
    X = np.arange(12.0).reshape(4, 3)
    _, grad = mse_loss_grad(np.zeros(3), X, np.ones(4))
    assert grad.shape == (3,), f"expected (3,), got {grad.shape}"


def test_fit_returns_weights_and_one_loss_per_step():
    X = np.array([[1.0], [2.0], [3.0]])
    w, history = fit(X, 2.0 * X[:, 0], 0.05, 7)
    assert w.shape == (1,), f"expected (1,), got {w.shape}"
    assert len(history) == 7, f"expected 7 losses, got {len(history)}"


def test_r2_of_a_perfect_and_a_mean_only_model():
    y = np.array([1.0, 2.0, 3.0, 4.0])
    assert_close(r2_score(y, y), 1.0)
    assert_close(r2_score(y, np.full(4, y.mean())), 0.0)
