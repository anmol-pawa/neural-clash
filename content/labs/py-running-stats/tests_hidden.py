import numpy as np
from nc_test import assert_close


def test_matches_numpy_on_random_data():
    rng = np.random.default_rng(0)
    xs = rng.normal(3.0, 2.0, 500)
    s = RunningStats()
    for x in xs:
        s.add(float(x))
    assert_close(s.mean(), xs.mean(), rtol=1e-9)
    assert_close(s.variance(), xs.var(ddof=1), rtol=1e-9)


def test_fewer_than_two_values_has_zero_variance():
    s = RunningStats()
    assert s.variance() == 0.0
    s.add(5.0)
    assert s.variance() == 0.0 and s.mean() == 5.0


def test_stable_with_a_huge_offset():
    xs = [1e9 + d for d in (0.1, 0.2, 0.3, 0.4, 0.5)]
    s = RunningStats()
    for x in xs:
        s.add(x)
    assert_close(s.variance(), 0.025, rtol=1e-6)


def test_variance_is_never_negative():
    s = RunningStats()
    for _ in range(1000):
        s.add(0.1)
    assert s.variance() >= 0.0


def test_instances_do_not_share_state():
    a, b = RunningStats(), RunningStats()
    a.add(100.0)
    assert b.mean() == 0.0 or b.mean() != 100.0
