def test_exact_multiple_has_no_empty_tail():
    assert list(batches(range(6), 3)) == [[0, 1, 2], [3, 4, 5]]


def test_empty_input():
    assert list(batches([], 4)) == []


def test_size_larger_than_input():
    assert list(batches("ab", 10)) == [["a", "b"]]


def test_invalid_size_raises_when_iterated():
    try:
        list(batches([1], 0))
    except ValueError:
        return
    raise AssertionError("size 0 should raise ValueError")


def test_works_on_a_one_shot_generator():
    gen = (i * i for i in range(5))
    assert list(batches(gen, 2)) == [[0, 1], [4, 9], [16]]


def test_each_batch_is_a_fresh_list():
    kept = list(batches(range(6), 2))
    assert kept == [[0, 1], [2, 3], [4, 5]]


def test_is_lazy():
    def endless():
        i = 0
        while True:
            yield i
            i += 1

    it = batches(endless(), 3)
    assert next(it) == [0, 1, 2]
    assert next(it) == [3, 4, 5]
