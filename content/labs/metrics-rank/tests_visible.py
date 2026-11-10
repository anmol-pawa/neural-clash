import numpy as np
from nc_test import assert_close


def test_precision_and_recall_at_k():
    assert_close(precision_at_k([1, 0, 1, 0], 2), 0.5)
    assert_close(recall_at_k([1, 0, 1, 0], 2, 4), 0.25)


def test_mrr_first_hit():
    assert_close(mrr([[0, 1], [1, 0]]), 0.75)


def test_ndcg_of_a_perfect_ranking_is_one():
    assert_close(ndcg_at_k([3, 2, 1, 0], 4), 1.0)


def test_ece_of_perfectly_calibrated_bins():
    assert_close(ece([0.25, 0.25, 0.25, 0.25], [1, 0, 0, 0]), 0.0)
