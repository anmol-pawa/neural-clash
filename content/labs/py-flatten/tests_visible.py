def test_basic():
    assert flatten([1, [2, [3, 4]], 5]) == [1, 2, 3, 4, 5]
