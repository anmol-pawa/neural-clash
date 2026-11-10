import numpy as np
from nc_test import assert_close


def test_gini_values_and_edges():
    assert_close(gini(np.array([1, 1, 1, 1])), 0.0)
    assert_close(gini(np.array([0, 0, 0, 1])), 1 - (0.75 ** 2 + 0.25 ** 2))
    assert_close(gini(np.array([0, 1, 2])), 1 - 3 * (1 / 3) ** 2)
    assert_close(gini(np.array([], dtype=int)), 0.0)


def test_gini_ignores_label_values_and_order():
    assert_close(gini(np.array([7, 3, 7, 3, 7])), gini(np.array([0, 0, 1, 1, 0])))


def test_knn_majority_vote_not_just_the_nearest():
    Xtr = np.array([[0.0], [1.0], [1.1], [1.2], [9.0]])
    ytr = np.array([0, 1, 1, 1, 0])
    # nearest to 0.4 is the 0 at x=0, but the three nearest are 0,1,1 -> class 1
    assert list(knn_predict(Xtr, ytr, np.array([[0.4]]), 3)) == [1]
    assert list(knn_predict(Xtr, ytr, np.array([[0.4]]), 1)) == [0]


def test_knn_tie_goes_to_the_smallest_label():
    Xtr = np.array([[0.0], [2.0]])
    assert list(knn_predict(Xtr, np.array([5, 3]), np.array([[1.0]]), 2)) == [3]
    assert list(knn_predict(Xtr, np.array([3, 5]), np.array([[1.0]]), 2)) == [3]


def test_knn_distance_tie_prefers_the_earlier_training_point():
    Xtr = np.array([[-1.0], [1.0], [5.0]])
    assert list(knn_predict(Xtr, np.array([4, 9, 9]), np.array([[0.0]]), 1)) == [4]
    assert list(knn_predict(Xtr, np.array([9, 4, 9]), np.array([[0.0]]), 1)) == [9]


def test_knn_many_equal_distances_resolve_by_training_order():
    Xtr = np.tile(np.array([[1.0], [-1.0], [3.0]]), (20, 1))  # distances from 0 are 1, 1, 3, 1, 1, 3, ...
    ytr = np.arange(60) % 2
    for k in range(1, 13):
        order = sorted(range(60), key=lambda i: (abs(Xtr[i, 0]), i))[:k]  # ties: earlier index first
        votes = np.bincount(ytr[order], minlength=2)
        want = int(np.argmax(votes))  # tie -> smallest label
        got = int(knn_predict(Xtr, ytr, np.array([[0.0]]), k)[0])
        assert got == want, f"k={k}: equal distances must resolve by training order; expected {want}, got {got}"


def test_knn_uses_all_dimensions_and_leaves_inputs_alone():
    Xtr = np.array([[0.0, 0.0], [0.0, 5.0], [5.0, 0.0], [5.0, 5.0]])
    ytr = np.array([0, 1, 2, 3])
    Xte = np.array([[0.2, 4.7], [4.6, 0.1], [5.1, 4.9]])
    X0, y0, T0 = Xtr.copy(), ytr.copy(), Xte.copy()
    assert list(knn_predict(Xtr, ytr, Xte, 1)) == [1, 2, 3]
    assert_close(Xtr, X0)
    assert_close(ytr, y0)
    assert_close(Xte, T0)


def test_knn_k_equal_n_predicts_the_majority_class_everywhere():
    rng = np.random.default_rng(0)
    Xtr = rng.normal(size=(9, 2))
    ytr = np.array([0, 0, 0, 0, 0, 1, 1, 1, 2])
    out = knn_predict(Xtr, ytr, rng.normal(size=(4, 2)), 9)
    assert list(out) == [0, 0, 0, 0]


def test_knn_beats_chance_on_two_blobs():
    rng = np.random.default_rng(1)
    Xtr = np.vstack([rng.normal(-1.5, 1, size=(60, 2)), rng.normal(1.5, 1, size=(60, 2))])
    ytr = np.repeat([0, 1], 60)
    Xte = np.vstack([rng.normal(-1.5, 1, size=(40, 2)), rng.normal(1.5, 1, size=(40, 2))])
    yte = np.repeat([0, 1], 40)
    assert np.mean(knn_predict(Xtr, ytr, Xte, 5) == yte) > 0.9


def test_kmeans_assign_matches_brute_force_with_first_index_on_ties():
    rng = np.random.default_rng(2)
    X, C = rng.normal(size=(30, 3)), rng.normal(size=(4, 3))
    want = [int(np.argmin([np.sum((x - c) ** 2) for c in C])) for x in X]
    assert list(kmeans_assign(X, C)) == want
    assert list(kmeans_assign(np.array([[1.0]]), np.array([[0.0], [2.0]]))) == [0]


def test_kmeans_update_takes_means_and_keeps_empty_clusters():
    X = np.array([[0.0, 0.0], [2.0, 0.0], [10.0, 10.0]])
    C = np.array([[1.0, 1.0], [9.0, 9.0], [50.0, 50.0]])
    C0 = C.copy()
    new = kmeans_update(X, np.array([0, 0, 1]), C)
    assert_close(new, [[1.0, 0.0], [10.0, 10.0], [50.0, 50.0]])
    assert_close(C, C0)
    assert new is not C, "return a new array"


def test_lloyd_iterations_never_increase_the_inertia_and_converge():
    rng = np.random.default_rng(3)
    X = np.vstack([rng.normal(m, 0.5, size=(30, 2)) for m in ((0, 0), (6, 0), (3, 5))])
    C = X[[0, 31, 61]].copy()

    def inertia(C):
        return float(np.sum((X - C[kmeans_assign(X, C)]) ** 2))

    prev = inertia(C)
    for _ in range(10):
        C = kmeans_update(X, kmeans_assign(X, C), C)
        cur = inertia(C)
        assert cur <= prev + 1e-9, "a Lloyd step can only lower the within-cluster sum of squares"
        prev = cur
    assert_close(sorted(C[:, 0]), [0.0, 3.0, 6.0], atol=0.35)


def test_best_split_perfect_and_midpoint_threshold():
    t, gain = best_split(np.array([3.0, 1.0, 9.0, 7.0]), np.array([0, 0, 1, 1]))  # unsorted input
    assert_close(t, 5.0)
    assert_close(gain, 0.5)


def test_best_split_gain_weights_by_child_size():
    x = np.array([1.0, 2.0, 3.0, 4.0, 5.0, 6.0])
    y = np.array([0, 0, 0, 0, 1, 0])
    t, gain = best_split(x, y)
    assert_close(t, 4.5)
    parent = gini(y)
    child = (4 * gini(y[:4]) + 2 * gini(y[4:])) / 6
    assert_close(gain, parent - child)
    # a split that leaves the single positive on the small side beats the others
    assert gain > parent - (3 * gini(y[:3]) + 3 * gini(y[3:])) / 6


def test_best_split_none_when_nothing_helps():
    assert best_split(np.array([1.0, 2.0, 3.0]), np.array([1, 1, 1])) == (None, 0.0)
    assert best_split(np.array([2.0, 2.0, 2.0, 2.0]), np.array([0, 1, 0, 1])) == (None, 0.0)


def test_best_split_ties_keep_the_smallest_threshold_and_handles_duplicates():
    t, gain = best_split(np.array([1.0, 1.0, 2.0, 2.0, 3.0, 3.0]), np.array([0, 0, 1, 1, 0, 0]))
    assert_close(t, 1.5)  # splitting at 1.5 and at 2.5 give the same gain: keep the smaller
    assert gain > 0
    t, _ = best_split(np.array([1.0, 1.0, 5.0, 5.0]), np.array([0, 0, 1, 1]))
    assert_close(t, 3.0)


def test_best_split_is_at_least_as_good_as_a_brute_force_scan():
    rng = np.random.default_rng(4)
    x = rng.integers(0, 12, size=40).astype(float)
    y = (x + rng.normal(0, 2.5, size=40) > 6).astype(int)
    t, gain = best_split(x, y)
    best = 0.0
    for c in np.arange(0.5, 11.5, 1.0):
        l, r = y[x <= c], y[x > c]
        if l.size and r.size:
            best = max(best, gini(y) - (l.size * gini(l) + r.size * gini(r)) / y.size)
    assert_close(gain, best, atol=1e-9)
