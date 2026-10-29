def test_ties_are_alphabetical():
    assert top_k_frequent(["pear", "apple", "fig", "apple", "pear", "fig"], 2) == ["apple", "fig"]


def test_ties_do_not_depend_on_first_seen_order():
    assert top_k_frequent(["z", "y", "x"], 3) == ["x", "y", "z"]


def test_k_zero_and_empty():
    assert top_k_frequent(["a"], 0) == []
    assert top_k_frequent([], 3) == []


def test_returns_a_new_list_and_leaves_input_alone():
    words = ["b", "a", "b"]
    out = top_k_frequent(words, 1)
    assert out == ["b"] and words == ["b", "a", "b"]


def test_large_input():
    words = [str(i % 1000) for i in range(200_000)] + ["7"] * 5
    assert top_k_frequent(words, 1) == ["7"]
