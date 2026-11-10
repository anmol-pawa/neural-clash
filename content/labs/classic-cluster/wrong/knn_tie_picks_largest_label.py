import numpy as np


def zscore(X_train, X_test):
    X_train = np.asarray(X_train, dtype=float)
    X_test = np.asarray(X_test, dtype=float)
    mu = X_train.mean(axis=0)
    sd = X_train.std(axis=0)
    sd = np.where(sd == 0, 1.0, sd)
    return (X_train - mu) / sd, (X_test - mu) / sd


def knn_predict(X_train, y_train, X_test, k):
    X_train = np.asarray(X_train, dtype=float)
    y_train = np.asarray(y_train, dtype=int)
    X_test = np.asarray(X_test, dtype=float)
    d = ((X_test[:, None, :] - X_train[None, :, :]) ** 2).sum(axis=2)
    order = np.argsort(d, axis=1, kind="stable")[:, :k]
    out = np.empty(len(X_test), dtype=int)
    for i, row in enumerate(order):
        out[i] = (len(np.bincount(y_train[row])) - 1 - np.bincount(y_train[row])[::-1].argmax())  # argmax picks the smallest label on a tie
    return out


def kmeans(X, centers, iters):
    X = np.asarray(X, dtype=float)
    C = np.array(centers, dtype=float)
    labels = np.zeros(len(X), dtype=int)
    for _ in range(iters):
        d = ((X[:, None, :] - C[None, :, :]) ** 2).sum(axis=2)
        labels = d.argmin(axis=1)
        for j in range(len(C)):
            members = X[labels == j]
            if len(members):
                C[j] = members.mean(axis=0)
    d = ((X[:, None, :] - C[None, :, :]) ** 2).sum(axis=2)
    return C, d.argmin(axis=1)


def gini(y):
    y = np.asarray(y, dtype=int)
    if y.size == 0:
        return 0.0
    p = np.bincount(y) / y.size
    return float(1.0 - np.sum(p ** 2))


def best_split(x, y):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=int)
    vals = np.unique(x)
    if vals.size < 2:
        return None, 0.0
    parent = gini(y)
    best_t, best_gain = None, -1.0
    for t in (vals[:-1] + vals[1:]) / 2.0:
        left, right = y[x <= t], y[x > t]
        child = (left.size * gini(left) + right.size * gini(right)) / y.size
        gain = parent - child
        if gain > best_gain + 1e-12:
            best_t, best_gain = float(t), float(gain)
    return best_t, best_gain
