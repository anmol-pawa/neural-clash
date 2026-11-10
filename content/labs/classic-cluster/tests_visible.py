import numpy as np
from nc_test import assert_close


def test_gini_of_a_fair_coin():
    assert_close(gini(np.array([0, 1, 0, 1])), 0.5)


def test_knn_one_neighbour_copies_the_closest_label():
    Xtr = np.array([[0.0, 0.0], [10.0, 10.0]])
    out = knn_predict(Xtr, np.array([0, 1]), np.array([[1.0, 1.0], [9.0, 9.0]]), 1)
    assert list(out) == [0, 1]


def test_kmeans_assign_picks_nearest_centre():
    got = kmeans_assign(np.array([[0.0], [4.0], [9.0]]), np.array([[0.0], [10.0]]))
    assert list(got) == [0, 0, 1]


def test_best_split_separates_two_blocks():
    t, gain = best_split(np.array([1.0, 2.0, 8.0, 9.0]), np.array([0, 0, 1, 1]))
    assert_close(t, 5.0)
    assert_close(gain, 0.5)
