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


def test_fit_returns_one_loss_per_epoch():
    X = np.array([[1.0], [2.0], [3.0]])
    w, losses = fit_linear(X, 2 * X[:, 0], 0.05, 7)
    assert len(losses) == 7, f"expected 7 losses, got {len(losses)}"
    assert w.shape == (1,)


def test_r2_of_a_perfect_model_is_one():
    X = np.array([[1.0], [2.0], [4.0]])
    assert_close(r2_score(np.array([3.0]), X, X @ np.array([3.0])), 1.0)
