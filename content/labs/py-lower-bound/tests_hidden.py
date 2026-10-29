import bisect
from itertools import product


def test_between_elements():
    assert lower_bound([1, 3, 5, 7], 4) == 2


def test_before_first_and_after_last():
    assert lower_bound([1, 3, 5], 0) == 0
    assert lower_bound([1, 3, 5], 9) == 3


def test_empty():
    assert lower_bound([], 1) == 0


def test_duplicates_return_the_first():
    assert lower_bound([2, 2, 2, 2], 2) == 0
    assert lower_bound([1, 2, 2, 2, 3], 2) == 1


def test_agrees_with_bisect_on_every_small_case():
    for n in range(0, 7):
        for a in (sorted(t) for t in product(range(4), repeat=n)):
            for x in range(-1, 5):
                assert lower_bound(a, x) == bisect.bisect_left(a, x), (a, x)


def test_logarithmic_on_a_big_list():
    a = list(range(0, 2_000_000, 2))
    calls = 0

    class Counting(list):
        def __getitem__(self, i):
            nonlocal calls
            calls += 1
            return super().__getitem__(i)

    b = Counting(a)
    assert lower_bound(b, 1_000_001) == 500_001
    assert calls <= 25, f"{calls} reads: not binary search"
