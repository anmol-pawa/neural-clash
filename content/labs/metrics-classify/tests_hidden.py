import numpy as np
from nc_test import assert_close


def _data(seed, n=200, sep=1.2, rate=0.3):
    r = np.random.default_rng(seed)
    y = (r.random(n) < rate).astype(int)
    s = r.normal(0, 1, n) + sep * y
    return s, y


def _auc_pairs(s, y):
    pos, neg = s[y == 1], s[y == 0]
    return sum((p > q) + 0.5 * (p == q) for p in pos for q in neg) / (len(pos) * len(neg))


def test_prf_values_and_asymmetry():
    # tp=2, fp=1, fn=3
    yt = [1, 1, 1, 1, 1, 0, 0, 0]
    yp = [1, 1, 0, 0, 0, 1, 0, 0]
    p, r, f = prf(yt, yp)
    assert_close([p, r], [2 / 3, 2 / 5])
    assert_close(f, 2 * (2 / 3) * 0.4 / (2 / 3 + 0.4))
    p2, r2, _ = prf(yp, yt)  # swapping the arguments swaps precision and recall
    assert_close([p2, r2], [r, p])


def test_f_beta_weights_recall_when_beta_is_large():
    yt = [1, 1, 1, 1, 0, 0, 0, 0]
    yp = [1, 1, 1, 1, 1, 1, 1, 0]   # recall 1.0, precision 4/7
    p, r, f2 = prf(yt, yp, beta=2.0)
    assert_close(f2, 5 * p * r / (4 * p + r))
    _, _, fhalf = prf(yt, yp, beta=0.5)
    assert f2 > fhalf          # recall is perfect, so weighting recall must score higher
    _, _, f1 = prf(yt, yp)
    assert fhalf < f1 < f2


def test_prf_zero_division_is_zero_not_nan():
    assert prf([1, 1, 0], [0, 0, 0]) == (0.0, 0.0, 0.0)   # nothing predicted: precision undefined
    assert prf([0, 0, 0], [1, 0, 1]) == (0.0, 0.0, 0.0)   # no positives at all: recall undefined
    assert prf([0, 0], [0, 0]) == (0.0, 0.0, 0.0)


def test_roc_auc_matches_pair_counting_on_random_data():
    for seed in range(4):
        s, y = _data(seed)
        assert_close(roc_auc(s, y), _auc_pairs(s, y))


def test_roc_auc_ties_count_half_and_orientation():
    assert_close(roc_auc([0.5, 0.5, 0.5, 0.5], [1, 0, 1, 0]), 0.5)
    assert_close(roc_auc([0.2, 0.5, 0.5, 0.9], [0, 0, 1, 1]), 3.5 / 4)
    assert_close(roc_auc([1, 2, 3], [0, 1, 1]) + roc_auc([-1, -2, -3], [0, 1, 1]), 1.0)  # negating scores flips it
    assert roc_auc([1, 2, 3], [1, 1, 1]) == 0.5


def test_roc_auc_ignores_monotone_rescaling():
    s, y = _data(7)
    assert_close(roc_auc(s, y), roc_auc(np.exp(s), y))
    assert_close(roc_auc(s, y), roc_auc(10 * s - 3, y))


def test_average_precision_known_values():
    # ranked: pos, neg, pos, neg -> precision at hits 1/1 and 2/3, each recall step 1/2
    assert_close(average_precision([0.9, 0.8, 0.7, 0.6], [1, 0, 1, 0]), 0.5 * 1 + 0.5 * (2 / 3))
    # all positives last: precision at hits 1/3 and 2/4
    assert_close(average_precision([0.9, 0.8, 0.7, 0.6], [0, 0, 1, 1]), 0.5 * (1 / 3) + 0.5 * (2 / 4))
    assert average_precision([0.3, 0.2], [0, 0]) == 0.0


def test_average_precision_divides_by_positives_not_samples():
    s = np.array([0.9] + [0.1] * 9)
    y = np.array([1] + [0] * 9)
    assert_close(average_precision(s, y), 1.0)


def test_average_precision_tied_scores_share_one_threshold():
    # one cut flags all three at once: precision 2/3, recall 1.0 -> AP = 2/3, whatever the input order
    assert_close(average_precision([0.5, 0.5, 0.5], [1, 0, 1]), 2 / 3)
    assert_close(average_precision([0.5, 0.5, 0.5], [0, 1, 1]), 2 / 3)


def test_base_rate_hurts_pr_but_not_roc():
    r = np.random.default_rng(11)
    pos = r.normal(1.5, 1, 200)
    neg_a = r.normal(0, 1, 200)
    neg_b = np.tile(neg_a, 20)          # same negatives, twenty times as many
    s1, y1 = np.r_[pos, neg_a], np.r_[np.ones(200), np.zeros(200)].astype(int)
    s2, y2 = np.r_[pos, neg_b], np.r_[np.ones(200), np.zeros(4000)].astype(int)
    assert_close(roc_auc(s1, y1), roc_auc(s2, y2))
    assert average_precision(s2, y2) < average_precision(s1, y1) - 0.2


def test_best_threshold_follows_the_cost_ratio():
    s = np.array([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9])
    y = np.array([0, 0, 1, 0, 0, 1, 0, 1, 1])
    t_even, c_even = best_threshold(s, y, 1.0, 1.0)
    t_fn, c_fn = best_threshold(s, y, 1.0, 10.0)      # misses are expensive: lower the bar
    t_fp, c_fp = best_threshold(s, y, 10.0, 1.0)      # false alarms are expensive: raise it
    assert t_fn <= t_even <= t_fp
    for t, cf, cn in [(t_even, 1, 1), (t_fn, 1, 10), (t_fp, 10, 1)]:
        pred = s >= t
        got = best_threshold(s, y, cf, cn)[1]
        assert_close(got, cf * np.sum(pred & (y == 0)) + cn * np.sum(~pred & (y == 1)))


def test_best_threshold_matches_brute_force_over_all_cuts():
    s, y = _data(5, n=60)
    for cf, cn in [(1, 1), (1, 5), (7, 1), (2, 3)]:
        t, c = best_threshold(s, y, cf, cn)
        brute = min(
            [cn * np.sum(y == 1)] + [cf * np.sum((s >= u) & (y == 0)) + cn * np.sum((s < u) & (y == 1)) for u in s]
        )
        assert_close(c, brute)


def test_best_threshold_flag_is_inclusive_and_nothing_is_a_choice():
    t, c = best_threshold([0.2, 0.8], [0, 1], 1.0, 1.0)
    assert_close([t, c], [0.8, 0.0])                    # score >= t flags the 0.8 item itself
    t, c = best_threshold([0.2, 0.8], [1, 0], 5.0, 1.0)  # a perfectly inverted model: flag nothing
    assert t == np.inf and c == 1.0
    t, c = best_threshold([0.2, 0.4, 0.6], [0, 0, 0], 1.0, 1.0)
    assert t == np.inf and c == 0.0


def test_best_threshold_ties_keep_the_higher_threshold():
    # cuts at 0.9 and at 0.2 both cost 1.0 (one miss vs one false alarm); the higher one must win
    t, c = best_threshold([0.9, 0.5, 0.2], [1, 0, 1], 1.0, 1.0)
    assert_close(c, 1.0)
    assert t == 0.9
