import numpy as np
from nc_test import assert_close, grad_check


def _data(seed, n=60, d=3, noise=0.1):
    rng = np.random.default_rng(seed)
    X = rng.normal(size=(n, d))
    w = rng.normal(size=d)
    return X, X @ w + 0.7 + noise * rng.normal(size=n), w


def test_loss_history_starts_at_the_initial_loss_and_falls():
    X, y, _ = _data(0)
    w, b, losses = fit_linear(X, y, lr=0.05, epochs=50)
    assert len(losses) == 50
    assert_close(losses[0], float(np.mean(y ** 2)))
    assert all(a >= c - 1e-12 for a, c in zip(losses, losses[1:])), "loss must not rise at a small learning rate"


def test_learns_the_bias():
    X, y, w_true = _data(1, noise=0.0)
    w, b, _ = fit_linear(X, y, lr=0.1, epochs=1500)
    assert_close(b, 0.7, atol=1e-2)
    assert_close(w, w_true, atol=1e-2)


def test_matches_the_closed_form_least_squares_fit():
    X, y, _ = _data(2, noise=0.5)
    w, b, _ = fit_linear(X, y, lr=0.1, epochs=4000)
    A = np.c_[X, np.ones(len(X))]
    sol = np.linalg.lstsq(A, y, rcond=None)[0]
    assert_close(np.r_[w, b], sol, atol=1e-3)


def test_inputs_are_not_modified():
    X, y, _ = _data(3)
    X0, y0 = X.copy(), y.copy()
    fit_linear(X, y, epochs=5)
    assert_close(X, X0)
    assert_close(y, y0)


def test_r2_baseline_and_negative():
    y = np.array([1.0, 2.0, 3.0, 10.0])
    X = np.zeros((4, 1))
    mean_model = evaluate(np.array([0.0]), float(y.mean()), X, y)
    assert_close(mean_model["r2"], 0.0, atol=1e-12)
    worse = evaluate(np.array([0.0]), 100.0, X, y)
    assert worse["r2"] < 0, "a model worse than the mean has negative R squared"


def test_r2_is_centred_on_the_mean_of_y():
    y = np.array([100.0, 101.0, 102.0, 103.0])
    X = np.arange(4.0).reshape(4, 1)
    m = evaluate(np.array([1.0]), 100.5, X, y)
    ss_res = float(np.sum((X[:, 0] + 100.5 - y) ** 2))
    ss_tot = float(np.sum((y - y.mean()) ** 2))
    assert_close(m["r2"], 1 - ss_res / ss_tot)
    assert_close(m["mse"], ss_res / 4)


def test_constant_target_does_not_divide_by_zero():
    m = evaluate(np.array([0.0]), 5.0, np.zeros((3, 1)), np.full(3, 5.0))
    assert m["r2"] == 0.0


def test_generalises_to_unseen_data():
    X, y, _ = _data(4, n=200, noise=0.2)
    w, b, _ = fit_linear(X[:150], y[:150], lr=0.1, epochs=1000)
    assert evaluate(w, b, X[150:], y[150:])["r2"] > 0.95
