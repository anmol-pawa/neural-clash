import numpy as np
from nc_test import assert_close


def test_prf_counts():
    p, r, f = prf([1, 1, 0, 0], [1, 0, 1, 0])
    assert_close([p, r, f], [0.5, 0.5, 0.5])


def test_roc_auc_perfect_and_reversed():
    assert_close(roc_auc([0.1, 0.2, 0.8, 0.9], [0, 0, 1, 1]), 1.0)
    assert_close(roc_auc([0.9, 0.8, 0.2, 0.1], [0, 0, 1, 1]), 0.0)


def test_average_precision_perfect_ranking():
    assert_close(average_precision([0.9, 0.8, 0.1], [1, 1, 0]), 1.0)


def test_best_threshold_prefers_cheap_errors():
    t, c = best_threshold([0.1, 0.4, 0.6, 0.9], [0, 0, 1, 1], 1.0, 1.0)
    assert_close([t, c], [0.6, 0.0])
