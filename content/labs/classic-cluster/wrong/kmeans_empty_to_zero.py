import numpy as np


def knn_predict(Xtr, ytr, Xte, k):
    Xtr, Xte = np.asarray(Xtr, dtype=float), np.asarray(Xte, dtype=float)
    ytr = np.asarray(ytr)
    d2 = ((Xte[:, None, :] - Xtr[None, :, :]) ** 2).sum(axis=2)
    order = np.argsort(d2, axis=1, kind="stable")[:, :k]  # stable: equal distances keep training order
    out = np.empty(len(Xte), dtype=ytr.dtype)
    for i, nbrs in enumerate(order):
        labels, counts = np.unique(ytr[nbrs], return_counts=True)
        out[i] = labels[np.argmax(counts)]  # np.unique sorts, so ties go to the smallest label
    return out


def kmeans_assign(X, centers):
    X, centers = np.asarray(X, dtype=float), np.asarray(centers, dtype=float)
    d2 = ((X[:, None, :] - centers[None, :, :]) ** 2).sum(axis=2)
    return np.argmin(d2, axis=1)


def kmeans_update(X, assign, centers):
    X, centers = np.asarray(X, dtype=float), np.asarray(centers, dtype=float)
    new = centers.copy()
    for j in range(len(centers)):
        members = X[assign == j]
        if len(members):  # an empty cluster keeps its old centre
            new[j] = members.mean(axis=0)
        else:
            new[j] = 0.0
    return new


def gini(y):
    y = np.asarray(y)
    if y.size == 0:
        return 0.0
    p = np.unique(y, return_counts=True)[1] / y.size
    return float(1.0 - np.sum(p ** 2))


def best_split(x, y):
    x, y = np.asarray(x, dtype=float), np.asarray(y)
    parent = gini(y)
    best_t, best_gain = None, 0.0
    values = np.unique(x)
    for lo, hi in zip(values[:-1], values[1:]):
        t = (lo + hi) / 2.0
        left, right = y[x <= t], y[x > t]
        child = (left.size * gini(left) + right.size * gini(right)) / y.size
        if parent - child > best_gain + 1e-12:  # strict: the first best threshold wins
            best_t, best_gain = float(t), float(parent - child)
    return best_t, best_gain
