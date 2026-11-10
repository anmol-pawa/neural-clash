import numpy as np
from nc_test import assert_close


def test_precision_at_k_divides_by_k_and_counts_graded_hits():
    assert_close(precision_at_k([2, 0, 1, 0, 0], 3), 2 / 3)
    assert_close(precision_at_k([1, 1], 5), 2 / 5)         # a short list is not rewarded
    assert_close(precision_at_k([0, 0, 0], 3), 0.0)


def test_recall_at_k_uses_the_corpus_total_not_k():
    assert_close(recall_at_k([1, 0, 1, 1], 4, 6), 3 / 6)
    assert_close(recall_at_k([1, 0, 1, 1], 1, 6), 1 / 6)
    assert recall_at_k([0, 0], 2, 0) == 0.0
    # precision falls and recall rises as k grows on a fixed list
    rel = [1, 0, 0, 1, 0, 1, 0, 0]
    ps = [precision_at_k(rel, k) for k in (1, 4, 8)]
    rs = [recall_at_k(rel, k, 3) for k in (1, 4, 8)]
    assert ps[0] > ps[1] > ps[2] and rs[0] < rs[1] <= rs[2]


def test_mrr_uses_the_first_relevant_rank_only():
    assert_close(mrr([[0, 0, 1, 1, 1]]), 1 / 3)             # later hits never help
    assert_close(mrr([[1], [0, 1], [0, 0, 0]]), (1 + 0.5 + 0) / 3)
    assert_close(mrr([[0, 0, 0, 0]]), 0.0)


def test_ndcg_known_value_and_gain_shape():
    rel = [3, 2, 3, 0, 1, 2]
    dcg = 7 / 1 + 3 / np.log2(3) + 7 / 2 + 0 + 1 / np.log2(6) + 3 / np.log2(7)
    ideal = [3, 3, 2, 2, 1, 0]
    idcg = 7 / 1 + 7 / np.log2(3) + 3 / 2 + 3 / np.log2(5) + 1 / np.log2(6) + 0
    assert_close(ndcg_at_k(rel, 6), dcg / idcg)
    # exponential gain: one grade-3 result outweighs three grade-1 results ranked above it
    assert ndcg_at_k([1, 1, 1, 3], 4) < ndcg_at_k([3, 1, 1, 1], 4)
    assert_close(ndcg_at_k([3, 0, 0, 0], 4), 1.0)


def test_ndcg_ideal_comes_from_the_whole_list_not_just_the_top_k():
    rel = [0, 0, 3, 0, 3]
    # top-2 holds nothing relevant, so DCG@2 = 0 even though a retrieved-only ideal would be 0 too (0/0)
    assert ndcg_at_k(rel, 2) == 0.0
    rel2 = [1, 0, 3, 3]
    ideal = 7 + 7 / np.log2(3)
    assert_close(ndcg_at_k(rel2, 2), 1.0 / ideal)           # ideal uses the 3s hidden below the cut


def test_ndcg_all_zero_is_zero_not_nan():
    assert ndcg_at_k([0, 0, 0], 3) == 0.0


def test_ndcg_discounts_by_position_and_k_truncates():
    assert ndcg_at_k([0, 1], 2) < ndcg_at_k([1, 0], 2) == 1.0
    assert_close(ndcg_at_k([0, 0, 1], 2), 0.0)


def test_ece_weights_bins_by_size_and_uses_absolute_gaps():
    # bin [0.9,1.0): 8 items conf 0.95, accuracy 0.5 -> gap 0.45 ; bin [0.1,0.2): 2 items conf 0.15, acc 0.5 -> 0.35
    p = [0.95] * 8 + [0.15] * 2
    y = [1, 1, 1, 1, 0, 0, 0, 0] + [1, 0]
    assert_close(ece(p, y), 0.8 * 0.45 + 0.2 * 0.35)
    # over- and under-confidence must not cancel
    p2 = [0.9, 0.9, 0.1, 0.1]
    y2 = [0, 0, 1, 1]
    assert_close(ece(p2, y2), 0.9)


def test_ece_edge_bins_and_perfect_calibration():
    assert_close(ece([1.0, 1.0], [1, 0]), 0.5)               # p = 1.0 lands in the last bin
    assert_close(ece([0.0, 0.0], [0, 0]), 0.0)
    r = np.random.default_rng(0)
    p = r.random(20000)
    y = (r.random(20000) < p).astype(int)
    assert ece(p, y) < 0.03
    assert ece(p, 1 - y) > 0.3


def test_ece_depends_on_bin_count():
    p = [0.05, 0.15, 0.25, 0.35]
    y = [1, 0, 0, 0]
    assert_close(ece(p, y, bins=1), abs(0.25 - 0.2))
    assert_close(ece(p, y, bins=10), (0.95 + 0.15 + 0.25 + 0.35) / 4)
