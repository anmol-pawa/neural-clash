import numpy as np
from nc_test import assert_close


def test_gini_of_a_pure_and_a_mixed_node():
    assert_close(gini(np.array([1, 1, 1])), 0.0)
    assert_close(gini(np.array([0, 1])), 0.5)


def test_knn_one_neighbour_copies_the_nearest_label():
    out = knn_predict(np.array([[0.0], [10.0]]), np.array([0, 1]), np.array([[1.0], [9.0]]), 1)
    assert out.tolist() == [0, 1]


def test_best_split_separates_two_groups():
    t, g = best_split(np.array([1.0, 2.0, 8.0, 9.0]), np.array([0, 0, 1, 1]))
    assert_close(t, 5.0)
    assert_close(g, 0.5)


def test_kmeans_moves_centers_to_the_means():
    C, lab = kmeans(np.array([[0.0], [2.0], [10.0], [12.0]]), np.array([[0.0], [12.0]]), 3)
    assert_close(C, [[1.0], [11.0]])
    assert lab.tolist() == [0, 0, 1, 1]
