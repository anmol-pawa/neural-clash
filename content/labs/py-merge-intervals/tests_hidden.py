def test_unsorted_input():
    assert merge_intervals([[8, 10], [1, 3], [2, 6]]) == [[1, 6], [8, 10]]


def test_touching_intervals_merge():
    assert merge_intervals([[1, 2], [2, 3]]) == [[1, 3]]


def test_contained_interval_does_not_shrink_the_end():
    assert merge_intervals([[1, 10], [2, 3], [4, 5]]) == [[1, 10]]


def test_empty_and_single():
    assert merge_intervals([]) == []
    assert merge_intervals([[5, 5]]) == [[5, 5]]


def test_input_is_not_mutated():
    data = [[3, 4], [1, 5]]
    merge_intervals(data)
    assert data == [[3, 4], [1, 5]]


def test_result_rows_are_independent_of_input_rows():
    data = [[1, 2], [2, 3]]
    out = merge_intervals(data)
    out[0][1] = 99
    assert data == [[1, 2], [2, 3]]
