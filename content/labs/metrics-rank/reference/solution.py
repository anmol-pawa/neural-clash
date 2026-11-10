import numpy as np


def precision_at_k(rel, k):
    rel = np.asarray(rel, dtype=float)
    return float(np.sum(rel[:k] > 0)) / k


def recall_at_k(rel, k, n_relevant):
    rel = np.asarray(rel, dtype=float)
    if n_relevant == 0:
        return 0.0
    return float(np.sum(rel[:k] > 0)) / n_relevant


def mrr(rel_lists):
    total = 0.0
    for rel in rel_lists:
        hits = np.flatnonzero(np.asarray(rel, dtype=float) > 0)
        if hits.size:
            total += 1.0 / (hits[0] + 1)
    return total / len(rel_lists)


def ndcg_at_k(rel, k):
    rel = np.asarray(rel, dtype=float)

    def dcg(g):
        g = g[:k]
        return float(np.sum((2.0 ** g - 1.0) / np.log2(np.arange(2, g.size + 2))))

    ideal = dcg(np.sort(rel)[::-1])
    return dcg(rel) / ideal if ideal > 0 else 0.0


def ece(probs, y, bins=10):
    probs = np.asarray(probs, dtype=float)
    y = np.asarray(y, dtype=float)
    idx = np.minimum(np.floor(probs * bins).astype(int), bins - 1)
    total = 0.0
    for b in range(bins):
        m = idx == b
        if m.any():
            total += m.sum() / probs.size * abs(y[m].mean() - probs[m].mean())
    return float(total)
