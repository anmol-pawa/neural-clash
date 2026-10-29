def test_groups_and_members_are_sorted():
    assert group_anagrams(["tea", "bat", "eat", "tab"]) == [["bat", "tab"], ["eat", "tea"]]


def test_empty_and_single():
    assert group_anagrams([]) == []
    assert group_anagrams(["a"]) == [["a"]]


def test_same_length_but_not_anagrams_stay_apart():
    assert group_anagrams(["ab", "cd"]) == [["ab"], ["cd"]]


def test_repeated_letters_matter():
    assert group_anagrams(["aab", "abb", "baa"]) == [["aab", "baa"], ["abb"]]


def test_duplicates_are_kept():
    assert group_anagrams(["a", "a"]) == [["a", "a"]]


def test_empty_string_is_its_own_group():
    assert group_anagrams(["", "a", ""]) == [["", ""], ["a"]]


def test_large_input():
    words = ["".join(chr(97 + (i * j) % 7) for j in range(6)) for i in range(20_000)]
    out = group_anagrams(words)
    assert sum(len(g) for g in out) == 20_000
