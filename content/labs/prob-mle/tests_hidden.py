import numpy as np
from nc_test import assert_close, numeric_grad


def _x(seed=0, n=50):
    return np.random.default_rng(seed).normal(2.0, 1.5, size=n)


def test_mle_uses_divisor_n():
    mu, s2 = gaussian_mle([2.0, 4.0, 6.0, 8.0])
    assert_close(mu, 5.0)
    assert_close(s2, 5.0)  # (9+1+1+9)/4, not /3


def test_mle_matches_numpy_and_does_not_modify_input():
    x = _x(1)
    x0 = x.copy()
    mu, s2 = gaussian_mle(x)
    assert_close(mu, x.mean())
    assert_close(s2, x.var())
    assert_close(x, x0)


def test_nll_value_against_the_density():
    x = np.array([0.0, 1.0, -1.0])
    mu, sigma = 0.5, 2.0
    dens = np.exp(-((x - mu) ** 2) / (2 * sigma ** 2)) / (sigma * np.sqrt(2 * np.pi))
    assert_close(gaussian_nll(x, mu, sigma), float(-np.sum(np.log(dens))))


def test_nll_gradient_vanishes_at_the_mle():
    x = _x(2)
    mu, s2 = gaussian_mle(x)
    sigma = float(np.sqrt(s2))
    g_mu = numeric_grad(lambda v: gaussian_nll(x, v[0], sigma), np.array([mu]))
    g_sig = numeric_grad(lambda v: gaussian_nll(x, mu, v[0]), np.array([sigma]))
    assert abs(float(g_mu[0])) < 1e-5, f"dNLL/dmu at the MLE should be 0, got {g_mu[0]:.3g}"
    assert abs(float(g_sig[0])) < 1e-5, f"dNLL/dsigma at the MLE should be 0, got {g_sig[0]:.3g}"


def test_the_mle_minimises_the_nll():
    x = _x(3)
    mu, s2 = gaussian_mle(x)
    best = gaussian_nll(x, mu, np.sqrt(s2))
    for dm in (-0.3, -0.05, 0.05, 0.3):
        assert gaussian_nll(x, mu + dm, np.sqrt(s2)) > best, f"moving mu by {dm} should raise the NLL"
    for f in (0.7, 0.95, 1.05, 1.4):
        assert gaussian_nll(x, mu, np.sqrt(s2) * f) > best, f"scaling sigma by {f} should raise the NLL"


def test_nll_penalises_a_vanishing_sigma():
    x = np.array([0.0, 1.0])
    assert gaussian_nll(x, 0.5, 1e-3) > gaussian_nll(x, 0.5, 0.5), "a tiny sigma must be punished by the squared term"
    assert gaussian_nll(x, 0.5, 1e3) > gaussian_nll(x, 0.5, 0.5), "a huge sigma must be punished by the log term"


def test_map_is_the_mode_of_the_posterior():
    x = np.array([1, 1, 0, 1, 0, 0, 1, 1])  # k=5, n=8
    got = bernoulli_map(x, 3, 2)
    assert_close(got, (5 + 3 - 1) / (8 + 3 + 2 - 2))
    grid = np.linspace(0.001, 0.999, 9999)
    log_post = (5 + 3 - 1) * np.log(grid) + (3 + 2 - 1) * np.log(1 - grid)
    assert abs(got - grid[np.argmax(log_post)]) < 1e-3, "the MAP must maximise the posterior density"


def test_map_with_a_flat_prior_equals_the_mle_and_shrinks_otherwise():
    x = np.array([1, 1, 1, 1, 0])
    assert_close(bernoulli_map(x, 1, 1), 0.8)
    assert 0.5 < bernoulli_map(x, 5, 5) < 0.8, "a prior centred on 0.5 must pull the estimate toward 0.5"


def test_map_stays_finite_with_all_zeros():
    assert_close(bernoulli_map(np.zeros(6, dtype=int), 2, 2), 1 / 8)


def test_bootstrap_means_use_the_data_not_the_indices():
    x = np.array([10.0, 20.0, 30.0])
    idx = np.array([[0, 0, 0], [2, 2, 1], [0, 1, 2]])
    assert_close(bootstrap_means(x, idx), [10.0, 80.0 / 3, 20.0])


def test_bootstrap_of_identity_resample_is_the_sample_mean_and_input_untouched():
    x = _x(4, 30)
    x0 = x.copy()
    idx = np.tile(np.arange(30), (5, 1))
    assert_close(bootstrap_means(x, idx), np.full(5, x.mean()))
    assert_close(x, x0)


def test_bootstrap_standard_error_matches_theory():
    x = _x(5, 200)
    idx = np.random.default_rng(7).integers(0, 200, size=(4000, 200))
    means = bootstrap_means(x, idx)
    se_theory = x.std() / np.sqrt(200)
    assert abs(float(means.std()) / se_theory - 1.0) < 0.06, "bootstrap SE must match sigma/sqrt(n)"
    assert abs(float(means.mean()) - float(x.mean())) < 0.03


def test_ci_uses_alpha_over_two_in_each_tail():
    stats = np.arange(1001.0)  # 0..1000: percentile p is exactly 10*p
    lo, hi = percentile_ci(stats, 0.10)
    assert_close(lo, 50.0)
    assert_close(hi, 950.0)
    lo, hi = percentile_ci(stats, 0.5)
    assert_close(lo, 250.0)
    assert_close(hi, 750.0)


def test_ci_does_not_sort_or_modify_the_input():
    stats = np.array([5.0, 1.0, 4.0, 2.0, 3.0])
    percentile_ci(stats, 0.2)
    assert_close(stats, [5.0, 1.0, 4.0, 2.0, 3.0])


def test_ci_coverage_on_a_known_mean():
    covered = 0
    trials = 200
    rng = np.random.default_rng(11)
    for _ in range(trials):
        x = rng.normal(0.0, 1.0, size=40)
        idx = rng.integers(0, 40, size=(300, 40))
        lo, hi = percentile_ci(bootstrap_means(x, idx), 0.10)
        covered += lo <= 0.0 <= hi
    assert 0.82 <= covered / trials <= 0.97, f"a 90% interval covered {covered / trials:.2f} of the time"
