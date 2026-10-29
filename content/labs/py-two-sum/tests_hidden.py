def test_not_found():
    assert two_sum([1, 2, 3], 100) is None
    assert two_sum([], 0) is None


def test_an_element_cannot_pair_with_itself():
    assert two_sum([3, 2, 4], 6) == (1, 2)
    assert two_sum([5], 10) is None


def test_duplicates_and_negatives():
    assert two_sum([3, 3], 6) == (0, 1)
    assert two_sum([-1, -2, -3, -4], -6) == (1, 3)
    assert two_sum([0, 4, 3, 0], 0) == (0, 3)


def test_indices_are_ordered():
    i, j = two_sum([10, 1, 9], 19)
    assert i < j


def test_large_input_is_linear():
    nums = list(range(0, 400_000, 2))
    assert two_sum(nums, 399_994 + 399_996) == (199_997, 199_998)
