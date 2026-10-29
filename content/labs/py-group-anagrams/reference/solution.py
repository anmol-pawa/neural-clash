from collections import defaultdict


def group_anagrams(words):
    groups = defaultdict(list)
    for word in words:
        groups["".join(sorted(word))].append(word)
    return sorted(sorted(g) for g in groups.values())
