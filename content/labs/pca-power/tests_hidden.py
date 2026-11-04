import numpy as np
from nc_test import assert_close


def _psd(seed, d, spread=3.0):
    rng = np.random.default_rng(seed)
    Q, _ = np.linalg.qr(rng.normal(size=(d, d)))
    vals = np.sort(rng.uniform(0.2, spread, size=d))[::-1] + np.arange(d)[::-1]
    return Q @ np.diag(vals) @ Q.T, vals, Q


def test_matches_eigh_top_pair():
    for seed in range(5):
        A, vals, _ = _psd(seed, 5)
        lam, v = power_iteration(A)
        w, V = np.linalg.eigh(A)
        assert_close(lam, w[-1], rtol=1e-6)
        assert abs(abs(v @ V[:, -1]) - 1) < 1e-6
        assert_close(np.linalg.norm(v), 1.0)


def test_start_vector_is_not_all_ones():
    # eigenvector (1,-1)/sqrt2 has the top eigenvalue; the all-ones vector is exactly orthogonal to it
    A = np.array([[3.0, -2.0], [-2.0, 3.0]])
    lam, v = power_iteration(A, iters=10)  # few iterations: round-off alone cannot rescue an all-ones start
    assert_close(lam, 5.0, rtol=1e-4)
    assert abs(abs(v @ np.array([1.0, -1.0]) / np.sqrt(2)) - 1) < 1e-4


def test_large_matrix_does_not_overflow():
    A = np.diag([1e6, 1.0, 0.5])
    lam, v = power_iteration(A, iters=2000)
    assert np.isfinite(lam) and np.isfinite(v).all(), "the vector overflowed: renormalise inside the loop"
    assert_close(lam, 1e6, rtol=1e-6)


def test_eigenvalue_is_rayleigh_quotient():
    A, _, _ = _psd(3, 4)
    lam, v = power_iteration(A, iters=1)
    assert_close(lam, v @ A @ v)


def test_sign_rule():
    for seed in range(6):
        A, _, _ = _psd(seed + 10, 4)
        _, v = power_iteration(A)
        assert v[np.argmax(np.abs(v))] > 0


def test_deflate_zeroes_the_pair_and_keeps_the_rest():
    A, vals, Q = _psd(4, 4)
    lam, v = power_iteration(A)
    B = deflate(A, lam, v)
    assert_close(B @ v, np.zeros(4), atol=1e-6)
    w = np.sort(np.linalg.eigvalsh(B))[::-1]
    assert_close(w[:3], vals[1:], rtol=1e-5)


def test_deflate_does_not_modify_input():
    A, _, _ = _psd(5, 3)
    A0 = A.copy()
    deflate(A, 2.0, np.array([1.0, 0.0, 0.0]))
    assert_close(A, A0)


def test_top_k_distinct_orthogonal_and_ordered():
    A, vals, _ = _psd(6, 5)
    lams, V = top_k_eigs(A, 3)
    assert_close(lams, vals[:3], rtol=1e-5)
    assert_close(V @ V.T, np.eye(3), atol=1e-5)


def test_pca_power_matches_svd_pca():
    rng = np.random.default_rng(21)
    X = rng.normal(size=(120, 5)) @ rng.normal(size=(5, 5)) * np.array([4, 3, 2, 1, 0.5]) + 7
    mean, comps, var = pca_power(X, 3)
    Xc = X - X.mean(axis=0)
    _, s, Vt = np.linalg.svd(Xc, full_matrices=False)
    assert_close(mean, X.mean(axis=0))
    assert_close(var, s[:3] ** 2 / (X.shape[0] - 1), rtol=1e-5)
    for i in range(3):
        assert abs(abs(comps[i] @ Vt[i]) - 1) < 1e-5, f"component {i} differs from the SVD direction"
        assert comps[i][np.argmax(np.abs(comps[i]))] > 0
