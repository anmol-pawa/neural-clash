import numpy as np
from nc_test import assert_close, numeric_grad


def _reg(seed=0, n=60, d=3):
    r = np.random.default_rng(seed)
    X = r.normal(size=(n, d))
    w = np.array([1.5, -2.0, 0.5])[:d]
    return X, X @ w + 0.7, w


def _cls(seed=0, n=80):
    r = np.random.default_rng(seed)
    X = r.normal(size=(n, 2))
    y = (X @ np.array([2.0, -1.0]) + 0.3 + 0.5 * r.normal(size=n) > 0).astype(float)
    return X, y


def test_ols_recovers_noise_free_weights_and_intercept():
    X, y, w = _reg(1)
    wh, b = normal_equation(X, y)
    assert_close(wh, w, atol=1e-8)
    assert_close(b, 0.7, atol=1e-8)


def test_ols_matches_lstsq_on_noisy_data():
    X, y, _ = _reg(2)
    y = y + np.random.default_rng(3).normal(size=y.size)
    wh, b = normal_equation(X, y)
    ref = np.linalg.lstsq(np.hstack([X, np.ones((len(y), 1))]), y, rcond=None)[0]
    assert_close(np.append(wh, b), ref, atol=1e-8)


def test_ols_does_not_modify_inputs():
    X, y, _ = _reg(4)
    X0, y0 = X.copy(), y.copy()
    normal_equation(X, y)
    ridge_fit(X, y, 1.0)
    assert_close(X, X0)
    assert_close(y, y0)


def test_ridge_with_zero_lambda_is_ols():
    X, y, _ = _reg(5)
    y = y + np.random.default_rng(6).normal(size=y.size)
    w0, b0 = normal_equation(X, y)
    w1, b1 = ridge_fit(X, y, 0.0)
    assert_close(w1, w0, atol=1e-8)
    assert_close(b1, b0, atol=1e-8)


def test_ridge_matches_the_closed_form_and_shrinks():
    X, y, _ = _reg(7)
    y = y + np.random.default_rng(8).normal(size=y.size)
    w0, _ = normal_equation(X, y)
    w1, b1 = ridge_fit(X, y, 10.0)
    # closed form on centred data: the intercept is the only unpenalised term
    Xc, yc = X - X.mean(0), y - y.mean()
    w_ref = np.linalg.solve(Xc.T @ Xc + 10.0 * np.eye(3), Xc.T @ yc)
    assert_close(w1, w_ref, atol=1e-8)
    assert_close(b1, y.mean() - X.mean(0) @ w_ref, atol=1e-8)
    assert np.linalg.norm(w1) < np.linalg.norm(w0), "ridge must shrink the weight vector"


def test_ridge_does_not_penalise_the_intercept():
    X, y, _ = _reg(9)
    w1, b1 = ridge_fit(X, y, 5.0)
    w2, b2 = ridge_fit(X, y + 100.0, 5.0)
    assert_close(w2, w1, atol=1e-8)
    assert_close(b2 - b1, 100.0, atol=1e-6)


def test_ridge_shrinks_monotonically_with_lambda():
    X, y, _ = _reg(10)
    y = y + np.random.default_rng(11).normal(size=y.size)
    norms = [np.linalg.norm(ridge_fit(X, y, lam)[0]) for lam in (0.0, 1.0, 10.0, 100.0, 1000.0)]
    assert all(a > b for a, b in zip(norms, norms[1:])), f"norms should strictly fall: {norms}"


def test_sigmoid_values_and_no_overflow():
    z = np.array([-1000.0, -2.0, 0.0, 2.0, 1000.0])
    with np.errstate(over="raise", invalid="raise", divide="raise"):
        s = sigmoid(z)
    assert_close(s[1:4], [1 / (1 + np.exp(2)), 0.5, 1 / (1 + np.exp(-2))])
    assert s[0] == 0.0 and s[4] == 1.0
    assert_close(sigmoid(z) + sigmoid(-z), np.ones(5))


def test_loss_value_and_stability():
    X, y = _cls(12)
    w, b = np.array([0.4, -0.2]), 0.1
    p = 1 / (1 + np.exp(-(X @ w + b)))
    assert_close(logistic_loss(X, y, w, b), -np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))
    big = logistic_loss(np.array([[1.0], [-1.0]]), np.array([0.0, 1.0]), np.array([800.0]), 0.0)
    assert np.isfinite(big) and abs(big - 800.0) < 1e-6, f"confidently wrong by 800 logits costs 800, got {big}"


def test_gradient_matches_finite_differences():
    X, y = _cls(13)
    w, b = np.array([0.4, -0.2]), 0.1
    gw, gb = logistic_grad(X, y, w, b)
    nw = numeric_grad(lambda v: logistic_loss(X, y, v, b), w)
    nb = numeric_grad(lambda v: logistic_loss(X, y, w, v[0]), np.array([b]))
    assert_close(gw, nw, atol=1e-6, rtol=1e-5)
    assert_close(gb, nb[0], atol=1e-6, rtol=1e-5)


def test_gradient_is_zero_at_a_perfectly_calibrated_point():
    # one feature, one point per class, symmetric: w = b = 0 gives p = 0.5 so the intercept gradient is 0
    X = np.array([[1.0], [1.0]])
    gw, gb = logistic_grad(X, np.array([0.0, 1.0]), np.zeros(1), 0.0)
    assert_close(gb, 0.0)
    assert_close(gw, [0.0])


def test_gd_decreases_the_loss_every_step_and_separates_the_classes():
    X, y = _cls(14)
    losses = []
    for s in (0, 1, 5, 20, 100):
        w, b = logistic_gd(X, y, 0.5, s)
        losses.append(logistic_loss(X, y, w, b))
    assert all(a > b for a, b in zip(losses, losses[1:])), f"loss must fall: {losses}"
    w, b = logistic_gd(X, y, 0.5, 400)
    acc = float(np.mean(((X @ w + b) > 0) == (y == 1)))
    assert acc > 0.9, f"accuracy {acc}"


def test_gd_zero_steps_is_zero_and_one_step_is_the_gradient():
    X, y = _cls(15)
    w, b = logistic_gd(X, y, 0.3, 0)
    assert_close(w, np.zeros(2))
    assert b == 0.0
    gw, gb = logistic_grad(X, y, np.zeros(2), 0.0)
    w1, b1 = logistic_gd(X, y, 0.3, 1)
    assert_close(w1, -0.3 * gw)
    assert_close(b1, -0.3 * gb)
