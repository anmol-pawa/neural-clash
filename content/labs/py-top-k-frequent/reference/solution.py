from collections import Counter


def top_k_frequent(words, k):
    counts = Counter(words)
    ranked = sorted(counts, key=lambda w: (-counts[w], w))
    return ranked[:k]
