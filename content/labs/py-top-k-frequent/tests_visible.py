def test_basic():
    assert top_k_frequent(["a", "b", "a", "c", "b", "a"], 2) == ["a", "b"]


def test_k_larger_than_unique():
    assert top_k_frequent(["x", "y"], 5) == ["x", "y"]
