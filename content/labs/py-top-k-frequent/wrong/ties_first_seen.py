from collections import Counter


def top_k_frequent(words, k):
    return [w for w, _ in Counter(words).most_common(k)]
