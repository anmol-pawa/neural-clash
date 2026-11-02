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


def test_first_loss_is_the_loss_at_zero_weights():
    X, y, _ = _data(11, 12, 3)
    _, losses = fit_linear(X, y, 0.05, 5)
    assert_close(losses[0], mse_loss_grad(np.zeros(3), X, y)[0])


def test_losses_fall_on_every_epoch():
    X, _, w_true = _data(12, 40, 3)
    _, losses = fit_linear(X, X @ w_true, 0.05, 30)
    assert all(b < a for a, b in zip(losses, losses[1:])), "loss must fall each epoch at a small learning rate"


def test_fit_recovers_the_true_weights():
    X, _, w_true = _data(13, 80, 4)
    w, _ = fit_linear(X, X @ w_true, 0.1, 500)
    assert_close(w, w_true, atol=1e-3)


def test_fit_does_not_modify_its_inputs():
    X, y, _ = _data(14, 10, 2)
    X0, y0 = X.copy(), y.copy()
    fit_linear(X, y, 0.05, 10)
    assert_close(X, X0)
    assert_close(y, y0)


def test_fit_is_deterministic_and_starts_from_zero():
    X, y, _ = _data(15, 10, 2)
    w1, l1 = fit_linear(X, y, 0.05, 10)
    w2, l2 = fit_linear(X, y, 0.05, 10)
    assert_close(w1, w2)
    assert_close(l1, l2)


def test_zero_epochs_returns_zero_weights():
    X, y, _ = _data(16, 5, 3)
    w, losses = fit_linear(X, y, 0.1, 0)
    assert_close(w, np.zeros(3))
    assert len(losses) == 0


def test_r2_reference_values():
    X = np.array([[1.0], [2.0], [3.0], [4.0]])
    y = np.array([2.0, 4.0, 6.0, 8.0])
    assert_close(r2_score(np.array([0.0]), X, y), 1.0 - 120.0 / 20.0)  # worse than the mean: negative
    assert_close(r2_score(np.array([2.0]), X, y), 1.0)


def test_held_out_r2_is_high_on_a_noisy_linear_problem():
    rng = np.random.default_rng(21)
    w_true = np.array([1.5, -2.0, 0.5])
    Xtr, Xte = rng.normal(size=(200, 3)), rng.normal(size=(100, 3))
    ytr = Xtr @ w_true + 0.1 * rng.normal(size=200)
    yte = Xte @ w_true + 0.1 * rng.normal(size=100)
    w, _ = fit_linear(Xtr, ytr, 0.1, 300)
    assert r2_score(w, Xte, yte) > 0.98
