import numpy as np
from nc_test import assert_close


def _blobs(seed=0, n=30):
    r = np.random.default_rng(seed)
    a = r.normal([0, 0], 0.5, size=(n, 2))
    b = r.normal([4, 4], 0.5, size=(n, 2))
    return np.vstack([a, b]), np.array([0] * n + [1] * n)


def test_zscore_uses_train_statistics_only():
    tr = np.array([[1.0, 5.0], [3.0, 5.0]])
    te = np.array([[5.0, 7.0]])
    a, b = zscore(tr, te)
    assert_close(a, [[-1.0, 0.0], [1.0, 0.0]])  # constant column stays centred, not NaN
    assert_close(b, [[3.0, 2.0]])               # the test row is NOT standardised to itself


def test_zscore_uses_population_std_and_keeps_inputs():
    r = np.random.default_rng(1)
    tr, te = r.normal(3, 2, size=(40, 3)), r.normal(3, 2, size=(10, 3))
    tr0 = tr.copy()
    a, _ = zscore(tr, te)
    assert_close(a.mean(axis=0), np.zeros(3), atol=1e-9)
    assert_close(a.std(axis=0), np.ones(3), atol=1e-9)
    assert_close(tr, tr0)


def test_gini_values():
    assert_close(gini(np.array([0, 0, 1, 1])), 0.5)
    assert_close(gini(np.array([0, 0, 0, 1])), 1 - (0.75 ** 2 + 0.25 ** 2))
    assert_close(gini(np.array([0, 1, 2])), 1 - 3 / 9)
    assert gini(np.array([], dtype=int)) == 0.0


def test_knn_takes_the_nearest_not_the_farthest():
    Xtr = np.array([[0.0], [1.0], [10.0], [11.0]])
    ytr = np.array([0, 0, 1, 1])
    assert knn_predict(Xtr, ytr, np.array([[0.4], [10.6]]), 1).tolist() == [0, 1]


def test_knn_votes_among_k_and_breaks_ties_by_smaller_label():
    Xtr = np.array([[0.0], [1.0], [2.0], [10.0]])
    ytr = np.array([1, 0, 0, 1])
    # k=3 around 0.9: neighbours 1.0 (0), 0.0 (1), 2.0 (0) -> majority 0
    assert knn_predict(Xtr, ytr, np.array([[0.9]]), 3).tolist() == [0]
    # k=2 around 0.5: both 0.0 (label 1) and 1.0 (label 0) at distance 0.5 -> a 1-1 vote tie -> smaller label 0
    assert knn_predict(Xtr, ytr, np.array([[0.5]]), 2).tolist() == [0]


def test_knn_is_perfect_on_separated_blobs_and_k_equals_n_is_the_majority():
    X, y = _blobs(2)
    assert np.all(knn_predict(X, y, X, 3) == y)
    y3 = np.array([0, 0, 0, 1, 1])
    out = knn_predict(np.arange(5.0).reshape(-1, 1), y3, np.array([[4.0]]), 5)
    assert out.tolist() == [0]


def test_knn_scaling_matters():
    # feature 1 is tiny-scale but informative; feature 0 is huge-scale noise
    Xtr = np.array([[0.0, 0.0], [500.0, 1.0], [250.0, 0.0], [750.0, 1.0]])
    ytr = np.array([0, 1, 0, 1])
    q = np.array([[740.0, 0.0]])
    raw = knn_predict(Xtr, ytr, q, 1).tolist()
    a, b = zscore(Xtr, q)
    scaled = knn_predict(a, ytr, b, 1).tolist()
    assert raw == [1] and scaled == [0], f"raw={raw} scaled={scaled}"


def test_kmeans_converges_on_blobs_and_does_not_modify_the_initial_centers():
    X, _ = _blobs(3)
    init = np.array([[1.0, 0.0], [3.0, 3.0]])
    init0 = init.copy()
    C, lab = kmeans(X, init, 10)
    assert_close(init, init0)
    order = np.argsort(C[:, 0])
    assert_close(C[order], [[0, 0], [4, 4]], atol=0.4)
    assert np.all(lab[:30] == lab[0]) and np.all(lab[30:] == lab[30]) and lab[0] != lab[30]


def test_kmeans_runs_exactly_the_requested_rounds():
    X = np.array([[0.0], [1.0], [2.0], [3.0], [100.0]])
    c1, _ = kmeans(X, np.array([[0.0], [1.0]]), 1)
    c2, _ = kmeans(X, np.array([[0.0], [1.0]]), 2)
    assert_close(c1, [[0.0], [26.5]])
    assert_close(c2, [[1.5], [100.0]])
    assert not np.allclose(c1, c2), "a second round must move the centers"


def test_kmeans_keeps_an_empty_cluster_in_place():
    X = np.array([[0.0], [1.0]])
    C, lab = kmeans(X, np.array([[0.5], [100.0]]), 3)
    assert np.all(np.isfinite(C)), "an empty cluster must not become NaN"
    assert_close(C[1], [100.0])


def test_kmeans_inertia_never_increases():
    X, _ = _blobs(4)
    init = X[[0, 1, 2]].copy()
    prev = np.inf
    for it in (1, 2, 3, 5, 8):
        C, lab = kmeans(X, init, it)
        inertia = float(((X - C[lab]) ** 2).sum())
        assert inertia <= prev + 1e-9, f"inertia rose at {it} rounds"
        prev = inertia


def test_best_split_midpoint_threshold_and_gain():
    x = np.array([1.0, 2.0, 3.0, 10.0, 11.0, 12.0])
    y = np.array([0, 0, 0, 1, 1, 1])
    t, g = best_split(x, y)
    assert_close(t, 6.5)
    assert_close(g, 0.5)


def test_best_split_weights_children_by_size():
    x = np.array([1.0, 2.0, 3.0, 4.0, 5.0, 6.0])
    y = np.array([0, 0, 0, 0, 0, 1])
    t, g = best_split(x, y)
    # splitting off the lone 1 gives children (pure 5) and (pure 1): gain = parent impurity
    assert_close(t, 5.5)
    assert_close(g, 1 - (25 / 36 + 1 / 36))
    # an unweighted average of child impurities would also give 0 here; use a mixed case to separate them
    x2 = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
    y2 = np.array([0, 1, 0, 1, 1])
    t2, g2 = best_split(x2, y2)
    parent = gini(y2)
    child = lambda t_: ((x2 <= t_).sum() * gini(y2[x2 <= t_]) + (x2 > t_).sum() * gini(y2[x2 > t_])) / 5
    cands = [(parent - child(m), m) for m in (1.5, 2.5, 3.5, 4.5)]
    best = max(c[0] for c in cands)
    assert_close(g2, best)
    assert_close(t2, min(m for gg, m in cands if abs(gg - best) < 1e-12))


def test_best_split_ties_take_the_smallest_threshold_and_constant_x_has_none():
    x = np.array([0.0, 1.0, 2.0, 3.0])
    y = np.array([0, 1, 1, 0])
    t, _ = best_split(x, y)
    assert_close(t, 0.5)  # 0.5 and 2.5 tie by symmetry
    assert best_split(np.array([2.0, 2.0, 2.0]), np.array([0, 1, 0])) == (None, 0.0)


def test_best_split_handles_duplicates_in_x():
    x = np.array([1.0, 1.0, 2.0, 2.0, 3.0, 3.0])
    y = np.array([0, 0, 0, 1, 1, 1])
    t, g = best_split(x, y)
    assert t in (1.5, 2.5)
    assert g > 0.1
