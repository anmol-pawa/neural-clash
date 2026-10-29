def test_empty_and_empty_inner():
    assert flatten([]) == []
    assert flatten([[], [[]], ()]) == []


def test_strings_are_leaves():
    assert flatten(["ab", ["c", ("de",)]]) == ["ab", "c", "de"]


def test_tuples_and_mixed_types():
    assert flatten((1, (2.5, [None, True]))) == [1, 2.5, None, True]


def test_order_is_left_to_right():
    assert flatten([[3, 2], [1], [[0]]]) == [3, 2, 1, 0]


def test_very_deep_nesting_does_not_overflow_the_stack():
    deep = 0
    for _ in range(50_000):
        deep = [deep]
    assert flatten(deep) == [0]


def test_does_not_mutate_input():
    data = [1, [2, [3]]]
    flatten(data)
    assert data == [1, [2, [3]]]
