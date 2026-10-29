from nc_test import assert_close


def test_mean_and_variance():
    s = RunningStats()
    for x in [2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0]:
        s.add(x)
    assert_close(s.mean(), 5.0)
    assert_close(s.variance(), 32.0 / 7.0)
