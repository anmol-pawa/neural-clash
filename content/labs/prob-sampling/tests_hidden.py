import numpy as np
from nc_test import assert_close

GRID = (np.arange(20000) + 0.5) / 20000  # evenly spaced uniforms: a deterministic stand-in for random ones


def test_exponential_matches_the_closed_form():
    u = np.array([0.0, 0.1, 0.5, 0.9, 0.999])
    assert_close(exp_inverse_cdf(u, 1.5), -np.log(1 - u) / 1.5)


def test_exponential_u_zero_is_finite_zero():
    out = exp_inverse_cdf(np.array([0.0]), 3.0)
    assert np.isfinite(out).all() and out[0] == 0.0, "u = 0 must map to 0, not infinity"


def test_exponential_rate_scales_inversely():
    a = exp_inverse_cdf(GRID, 1.0)
    b = exp_inverse_cdf(GRID, 4.0)
    assert_close(a / 4.0, b)
    assert abs(float(b.mean()) - 0.25) < 5e-3, f"mean should be 1/rate = 0.25, got {b.mean():.4f}"


def test_exponential_is_increasing_in_u_and_inverts_its_cdf():
    x = exp_inverse_cdf(GRID, 2.0)
    assert (np.diff(x) > 0).all(), "the inverse CDF must be increasing"
    assert_close(1 - np.exp(-2.0 * x), GRID, atol=1e-9)


def test_categorical_boundaries_belong_to_the_next_bucket():
    probs = [0.25, 0.25, 0.5]
    got = sample_categorical(probs, np.array([0.0, 0.25, 0.4999, 0.5, 0.9999]))
    assert list(got) == [0, 1, 1, 2, 2], f"got {list(got)}"


def test_categorical_frequencies_match_probs():
    probs = np.array([0.1, 0.2, 0.0, 0.3, 0.4])
    got = sample_categorical(probs, GRID)
    freq = np.bincount(got, minlength=5) / len(GRID)
    assert_close(freq, probs, atol=1e-3)
    assert freq[2] == 0.0, "a zero-probability category must never be chosen"


def test_categorical_never_indexes_past_the_end():
    probs = np.full(10, 0.1)  # cumsum ends at 0.9999999999999999
    got = sample_categorical(probs, np.array([0.99999999999999995, 1.0]))
    assert got.max() <= 9, f"index {got.max()} is out of range"


def test_categorical_keeps_the_input_shape():
    u = np.array([[0.1, 0.9], [0.5, 0.2]])
    got = sample_categorical([0.5, 0.5], u)
    assert got.shape == (2, 2) and got.dtype.kind in "iu"


def test_rejection_filters_exactly_by_the_envelope_rule():
    f = lambda x: 3 * x ** 2
    xs = np.array([0.2, 0.5, 0.8, 0.9, 1.0])
    us = np.array([0.5, 0.5, 0.5, 0.2, 0.9])
    out = rejection_sample(f, 3.0, xs, us)
    # accept iff u*3 <= 3x^2  <=>  u <= x^2
    assert_close(out, [0.8, 0.9, 1.0])


def test_rejection_recovers_the_target_distribution():
    f = lambda x: 3 * x ** 2  # Beta(3, 1): mean 3/4, E[x^2] = 3/5
    rng_grid = (np.arange(400) + 0.5) / 400
    xs = np.repeat(rng_grid, 400)
    us = np.tile(rng_grid, 400)
    out = rejection_sample(f, 3.0, xs, us)
    assert abs(len(out) / len(xs) - 1 / 3.0) < 2e-3, "acceptance rate must be 1/M"
    assert abs(float(out.mean()) - 0.75) < 5e-3, f"mean {out.mean():.4f}, expected 0.75"
    assert abs(float((out ** 2).mean()) - 0.6) < 5e-3


def test_rejection_does_not_modify_inputs_and_keeps_order():
    xs = np.array([0.9, 0.3, 0.7])
    us = np.array([0.1, 0.0, 0.1])
    x0, u0 = xs.copy(), us.copy()
    out = rejection_sample(lambda x: np.ones_like(x), 1.0, xs, us)
    assert_close(out, [0.9, 0.3, 0.7])
    assert_close(xs, x0)
    assert_close(us, u0)


def test_box_muller_matches_the_formula():
    u1, u2 = np.array([0.5, 0.1]), np.array([0.25, 0.75])
    z1, z2 = box_muller(u1, u2)
    r = np.sqrt(-2 * np.log(u1))
    assert_close(z1, r * np.cos(2 * np.pi * u2))
    assert_close(z2, r * np.sin(2 * np.pi * u2))


def test_box_muller_moments():
    n = 300
    g = (np.arange(n) + 0.5) / n
    u1 = np.repeat(g, n)
    u2 = np.tile(g, n)
    z1, z2 = box_muller(u1, u2)
    for z in (z1, z2):
        assert abs(float(z.mean())) < 2e-2, f"mean {z.mean():.4f}"
        assert abs(float(z.var()) - 1.0) < 3e-2, f"variance {z.var():.4f}"
    assert abs(float(np.mean(z1 * z2))) < 2e-2, "the two outputs must be uncorrelated"
    assert abs(float(np.mean(z1 ** 4)) - 3.0) < 0.15, "kurtosis must be that of a normal (3)"
