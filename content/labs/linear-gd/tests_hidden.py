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


def test_fit_history_starts_at_the_loss_for_zero_weights():
    X, y, _ = _data(11, 12, 3)
    w, history = fit(X, y, 0.05, 5)
    assert_close(history[0], mse_loss_grad(np.zeros(3), X, y)[0])
    assert_close(w, _manual_fit(X, y, 0.05, 5))


def _manual_fit(X, y, lr, steps):
    w = np.zeros(X.shape[1])
    for _ in range(steps):
        w = w - lr * (2.0 / len(y)) * (X.T @ (X @ w - y))
    return w


def test_fit_loss_decreases_every_step_with_a_small_lr():
    X, y, _ = _data(12, 40, 4)
    _, history = fit(X, y, 0.05, 60)
    assert all(b < a for a, b in zip(history, history[1:])), "loss must fall monotonically"


def test_fit_generalises_to_held_out_data():
    rng = np.random.default_rng(21)
    w_true = np.array([2.0, -1.0, 0.5])
    Xtr, Xte = rng.normal(size=(120, 3)), rng.normal(size=(60, 3))
    ytr = Xtr @ w_true + 0.1 * rng.normal(size=120)
    yte = Xte @ w_true + 0.1 * rng.normal(size=60)
    w, _ = fit(Xtr, ytr, 0.1, 300)
    assert r2_score(yte, Xte @ w) > 0.98, "a linear model should explain a linear signal on held-out data"


def test_fit_diverges_visibly_when_lr_is_too_large():
    X, y, _ = _data(13, 30, 3)
    _, history = fit(X, y, 5.0, 12)
    assert history[-1] > history[0], "an oversized step must make the loss grow, not hide it"


def test_r2_penalises_a_biased_model_and_can_go_negative():
    y = np.array([0.0, 1.0, 2.0, 3.0])
    assert r2_score(y, y + 10.0) < 0
    assert_close(r2_score(y, np.array([0.0, 1.0, 2.0, 4.0])), 1 - 1.0 / 5.0)


def test_r2_on_a_constant_target():
    assert_close(r2_score(np.ones(5), np.ones(5)), 1.0)
    assert_close(r2_score(np.ones(5), np.zeros(5)), 0.0)
