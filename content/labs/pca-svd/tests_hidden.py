import numpy as np
from nc_test import assert_close


def _data(seed=3, n=60, d=4):
    rng = np.random.default_rng(seed)
    return rng.normal(size=(n, d)) @ rng.normal(size=(d, d)) + rng.normal(size=d) * 5


def test_matches_covariance_eigendecomposition():
    X = _data()
    mean, comps, var = pca_fit(X, 4)
    vals, vecs = np.linalg.eigh(np.cov(X, rowvar=False))
    order = np.argsort(vals)[::-1]
    assert_close(var, vals[order])
    for i, j in enumerate(order):
        v = vecs[:, j]
        assert abs(abs(comps[i] @ v) - 1.0) < 1e-8, f"component {i} is not the eigenvector of the covariance"


def test_mean_is_column_mean_not_origin():
    X = _data(seed=4) + 100.0
    mean, comps, var = pca_fit(X, 2)
    assert_close(mean, X.mean(axis=0))
    assert var[0] < 1e3, "variance looks inflated: did you forget to centre?"


def test_components_orthonormal_rows():
    X = _data(seed=5, d=6)
    _, comps, _ = pca_fit(X, 4)
    assert comps.shape == (4, 6)
    assert_close(comps @ comps.T, np.eye(4), atol=1e-8)


def test_variances_use_n_minus_1_and_descend():
    X = _data(seed=6)
    _, _, var = pca_fit(X, 4)
    assert np.all(np.diff(var) <= 1e-12)
    assert_close(var.sum(), np.var(X, axis=0, ddof=1).sum())


def test_sign_rule_largest_entry_positive():
    for seed in range(8):
        X = _data(seed=seed + 20)
        _, comps, _ = pca_fit(X, 3)
        for c in comps:
            assert c[np.argmax(np.abs(c))] > 0, "largest-magnitude entry of each component must be positive"


def test_transform_has_zero_mean_and_matching_variance():
    X = _data(seed=7)
    mean, comps, var = pca_fit(X, 3)
    Z = pca_transform(X, mean, comps)
    assert_close(Z.mean(axis=0), np.zeros(3), atol=1e-8)
    assert_close(Z.var(axis=0, ddof=1), var)
    assert_close(np.corrcoef(Z, rowvar=False), np.eye(3), atol=1e-8)


def test_full_rank_round_trip_is_exact():
    X = _data(seed=8)
    mean, comps, _ = pca_fit(X, 4)
    assert_close(pca_inverse(pca_transform(X, mean, comps), mean, comps), X, atol=1e-8)


def test_truncated_reconstruction_error_equals_discarded_variance():
    X = _data(seed=9, n=80, d=5)
    mean, comps, var = pca_fit(X, 2)
    R = pca_inverse(pca_transform(X, mean, comps), mean, comps)
    err = ((X - R) ** 2).sum() / (X.shape[0] - 1)
    total = np.var(X, axis=0, ddof=1).sum()
    assert_close(err, total - var.sum(), rtol=1e-8)


def test_explained_ratio_uses_total_variance():
    X = _data(seed=10)
    _, _, var = pca_fit(X, 2)
    r = explained_ratio(X, var)
    assert r.shape == (2,)
    assert 0 < r.sum() < 1, "the top-2 of 4 directions cannot explain everything"
    _, _, full = pca_fit(X, 4)
    assert_close(explained_ratio(X, full).sum(), 1.0)


def test_inputs_not_modified():
    X = _data(seed=11)
    X0 = X.copy()
    pca_fit(X, 2)
    assert_close(X, X0)
