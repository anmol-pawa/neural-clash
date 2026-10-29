from nc_test import assert_close


def test_window_of_one_and_full_window():
    assert_close(moving_average([4, 8, 6], 1), [4, 8, 6])
    assert_close(moving_average([4, 8, 6], 3), [6])


def test_window_longer_than_input():
    assert moving_average([1, 2], 3) == []


def test_invalid_window_raises():
    for bad in (0, -2):
        try:
            moving_average([1, 2, 3], bad)
        except ValueError:
            continue
        raise AssertionError(f"w={bad} should raise ValueError")


def test_length_is_n_minus_w_plus_one():
    assert len(moving_average(list(range(10)), 4)) == 7


def test_long_input_is_linear():
    reads = 0

    class Counting(list):
        def __getitem__(self, i):
            nonlocal reads
            reads += len(range(*i.indices(len(self)))) if isinstance(i, slice) else 1
            return super().__getitem__(i)

    xs = Counting(range(300_000))
    out = moving_average(xs, 1000)
    assert len(out) == 299_001
    assert_close(out[0], 499.5)
    assert_close(out[-1], 299_499.5)
    assert reads <= 5 * len(xs), f"{reads} element reads for {len(xs)} items: each window is being re-summed"
