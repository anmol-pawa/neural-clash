from nc_test import assert_close


def test_basic():
    assert_close(moving_average([1, 2, 3, 4], 2), [1.5, 2.5, 3.5])
