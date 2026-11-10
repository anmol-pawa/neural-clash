import numpy as np
from nc_test import assert_close, numeric_grad


def _data(seed=0, n=60, d=3):
    rng = np.random.default_rng(seed)
    X = rng.normal(2.0, 1.5, size=(n, d))  # deliberately not centred: the intercept matters
    w = np.array([1.5, -2.0, 0.5])[:d]
    return X, w, rng


def test_ols_recovers_exact_parameters_on_noiseless_data():
    X, w, _ = _data(1)
    y = X @ w + 4.0
    w_hat, b_hat = ols_fit(X, y)
    assert_close(w_hat, w, atol=1e-8)
    assert_close(b_hat, 4.0, atol=1e-8)


def test_ols_matches_lstsq_on_noisy_data_and_leaves_inputs_alone():
    X, w, rng = _data(2)
    y = X @ w + 1.0 + rng.normal(0, 0.5, size=len(X))
    X0, y0 = X.copy(), y.copy()
    w_hat, b_hat = ols_fit(X, y)
    ref, *_ = np.linalg.lstsq(np.hstack([X, np.ones((len(X), 1))]), y, rcond=None)
    assert_close(w_hat, ref[:-1], atol=1e-8)
    assert_close(b_hat, ref[-1], atol=1e-8)
    assert_close(X, X0)
    assert_close(y, y0)


def test_ols_residuals_are_orthogonal_to_the_features_and_sum_to_zero():
    X, w, rng = _data(3)
    y = X @ w + 2.0 + rng.normal(0, 1.0, size=len(X))
    w_hat, b_hat = ols_fit(X, y)
    r = y - (X @ w_hat + b_hat)
    assert_close(X.T @ r, np.zeros(3), atol=1e-7)
    assert abs(float(r.sum())) < 1e-7, "an intercept makes the residuals sum to zero"


def test_ridge_matches_its_closed_form():
    X, w, rng = _data(4, d=2)
    y = X @ w + 3.0 + rng.normal(0, 0.5, size=len(X))
    lam = 7.0
    w_hat, b_hat = ridge_fit(X, y, lam)
    # stationarity: gradient of  sum (y - Xw - b)^2 + lam ||w||^2  must vanish
    r = y - (X @ w_hat + b_hat)
    assert_close(-2 * X.T @ r + 2 * lam * w_hat, np.zeros(2), atol=1e-6)
    assert abs(float(r.sum())) < 1e-7, "the intercept is unpenalised, so residuals still sum to zero"


def test_ridge_lambda_zero_is_ols_and_the_norm_shrinks_monotonically():
    X, w, rng = _data(5)
    y = X @ w + 1.0 + rng.normal(0, 1.0, size=len(X))
    assert_close(ridge_fit(X, y, 0.0)[0], ols_fit(X, y)[0], atol=1e-8)
    norms = [float(np.linalg.norm(ridge_fit(X, y, lam)[0])) for lam in (0.0, 1.0, 10.0, 100.0, 1e4)]
    assert all(a > c for a, c in zip(norms, norms[1:])), f"||w|| must fall as lambda grows, got {norms}"


def test_ridge_does_not_shrink_the_intercept():
    X, w, rng = _data(6)
    y = X @ w + 50.0 + rng.normal(0, 0.5, size=len(X))
    w_hat, b_hat = ridge_fit(X, y, 1e8)
    assert_close(w_hat, np.zeros(3), atol=1e-4)
    assert_close(b_hat, float(y.mean()), rtol=1e-4)  # all weights shrunk away: predict the mean
    # shifting every target by a constant must shift only the intercept
    w2, b2 = ridge_fit(X, y + 100.0, 5.0)
    w1, b1 = ridge_fit(X, y, 5.0)
    assert_close(w2, w1, atol=1e-8)
    assert_close(b2, b1 + 100.0, atol=1e-6)


def test_ridge_shrinks_the_correct_amount_in_one_dimension():
    x = np.array([[-1.0], [0.0], [1.0]])  # centred, sum x^2 = 2
    y = np.array([-2.0, 0.0, 2.0])  # slope 2
    w, b = ridge_fit(x, y, 2.0)
    assert_close(w, [2.0 * 2.0 / (2.0 + 2.0)])  # slope * Sxx / (Sxx + lam)
    assert_close(b, 0.0, atol=1e-9)


def test_sigmoid_values_symmetry_and_range():
    z = np.array([-3.0, -1.0, 0.0, 2.0, 5.0])
    assert_close(sigmoid(z), 1.0 / (1.0 + np.exp(-z)))
    assert_close(sigmoid(-z), 1.0 - sigmoid(z))
    assert sigmoid(np.zeros((2, 3))).shape == (2, 3), "sigmoid is elementwise and keeps the shape"


def test_sigmoid_is_stable_for_huge_inputs():
    with np.errstate(over="raise", invalid="raise", divide="raise"):
        out = sigmoid(np.array([-1000.0, 1000.0]))
    assert_close(out, [0.0, 1.0])


def test_loss_is_ln2_at_the_origin_and_matches_the_definition():
    X, _, rng = _data(7)
    y = (rng.random(len(X)) < 0.5).astype(float)
    loss, _, _ = logistic_loss_grad(np.zeros(3), 0.0, X, y)
    assert_close(loss, np.log(2))
    w, b = np.array([0.3, -0.2, 0.1]), 0.4
    p = 1.0 / (1.0 + np.exp(-(X @ w + b)))
    expected = -np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)) + 0.5 * 0.7 * np.sum(w ** 2)
    assert_close(logistic_loss_grad(w, b, X, y, 0.7)[0], expected)


def test_loss_stays_finite_for_confidently_wrong_predictions():
    X = np.array([[1000.0], [-1000.0]])
    y = np.array([0.0, 1.0])
    with np.errstate(over="raise", invalid="raise", divide="raise"):
        loss, gw, gb = logistic_loss_grad(np.array([1.0]), 0.0, X, y)
    assert np.isfinite(loss) and np.isfinite(gw).all() and np.isfinite(gb)
    assert_close(loss, 1000.0, rtol=1e-6)  # softplus(1000) is about 1000


def test_gradient_matches_finite_differences():
    X, _, rng = _data(8)
    y = (rng.random(len(X)) < 0.5).astype(float)
    w, b, lam = np.array([0.4, -0.6, 0.2]), -0.3, 0.5
    _, gw, gb = logistic_loss_grad(w, b, X, y, lam)
    num_w = numeric_grad(lambda v: logistic_loss_grad(v, b, X, y, lam)[0], w)
    num_b = numeric_grad(lambda v: logistic_loss_grad(w, v[0], X, y, lam)[0], np.array([b]))
    assert_close(gw, num_w, rtol=1e-5, atol=1e-7, msg="grad_w")
    assert_close(gb, num_b[0], rtol=1e-5, atol=1e-7, msg="grad_b")


def test_the_gradient_averages_over_the_batch():
    X, _, rng = _data(9, n=40)
    y = (rng.random(40) < 0.5).astype(float)
    w = np.array([0.1, 0.1, 0.1])
    _, gw1, gb1 = logistic_loss_grad(w, 0.0, X, y)
    _, gw2, gb2 = logistic_loss_grad(w, 0.0, np.vstack([X, X]), np.concatenate([y, y]))
    assert_close(gw1, gw2, atol=1e-9)  # duplicating the data must not change a mean
    assert_close(gb1, gb2, atol=1e-9)


def test_gradient_descent_lowers_the_loss_and_separates_clean_data():
    rng = np.random.default_rng(10)
    X = np.vstack([rng.normal(-2, 0.6, size=(40, 2)), rng.normal(2, 0.6, size=(40, 2))])
    y = np.concatenate([np.zeros(40), np.ones(40)])
    l0 = logistic_loss_grad(np.zeros(2), 0.0, X, y)[0]
    w, b = logistic_fit(X, y, 0.5, 200)
    l1 = logistic_loss_grad(w, b, X, y)[0]
    assert l1 < l0 * 0.2, f"loss should fall from {l0:.3f}, got {l1:.3f}"
    assert np.mean((X @ w + b > 0) == (y == 1)) == 1.0


def test_l2_penalty_shrinks_the_logistic_weights():
    rng = np.random.default_rng(11)
    X = np.vstack([rng.normal(-1, 1, size=(50, 2)), rng.normal(1, 1, size=(50, 2))])
    y = np.concatenate([np.zeros(50), np.ones(50)])
    w0, _ = logistic_fit(X, y, 0.3, 400, lam=0.0)
    w1, _ = logistic_fit(X, y, 0.3, 400, lam=1.0)
    assert np.linalg.norm(w1) < 0.7 * np.linalg.norm(w0), "a stronger L2 prior must give smaller weights"
