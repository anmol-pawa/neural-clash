import numpy as np
from nc_test import assert_close, grad_check


def _data(seed, n, d):
    rng = np.random.default_rng(seed)
    return rng.normal(size=(n, d)), rng.normal(size=n), rng.normal(size=d)


def test_loss_value():
    X = np.array([[1.0, 2.0], [3.0, 4.0]])
    loss, _ = mse_loss_grad(np.array([1.0, 0.0]), X, np.array([0.0, 0.0]))
    assert_close(loss, (1.0 + 9.0) / 2)


def test_gradient_matches_finite_differences():
    for seed, (n, d) in enumerate([(5, 3), (1, 4), (20, 1), (7, 7)]):
        X, y, w = _data(seed, n, d)
        _, grad = mse_loss_grad(w, X, y)
        grad_check(lambda v: mse_loss_grad(v, X, y)[0], w, grad)


def test_inputs_are_not_modified():
    X, y, w = _data(9, 6, 3)
    X0, y0, w0 = X.copy(), y.copy(), w.copy()
    mse_loss_grad(w, X, y)
    assert_close(X, X0)
    assert_close(y, y0)
    assert_close(w, w0)


def test_step_goes_downhill():
    X, y, w = _data(3, 10, 4)
    loss, grad = mse_loss_grad(w, X, y)
    w2 = gd_step(w, grad, 0.01)
    assert mse_loss_grad(w2, X, y)[0] < loss, "a small step must reduce the loss"
    assert_close(w2, w - 0.01 * grad)


def test_gd_converges_on_a_noiseless_problem():
    X, _, w_true = _data(4, 50, 3)
    y = X @ w_true
    w = np.zeros(3)
    for _ in range(400):
        _, g = mse_loss_grad(w, X, y)
        w = gd_step(w, g, 0.1)
    assert_close(w, w_true, atol=1e-3)
