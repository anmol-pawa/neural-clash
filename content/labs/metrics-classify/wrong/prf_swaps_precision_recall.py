import numpy as np


def prf(y_true, y_pred, beta=1.0):
    y_true = np.asarray(y_true, dtype=int)
    y_pred = np.asarray(y_pred, dtype=int)
    tp = float(np.sum((y_pred == 1) & (y_true == 1)))
    fp = float(np.sum((y_pred == 1) & (y_true == 0)))
    fn = float(np.sum((y_pred == 0) & (y_true == 1)))
    p = tp / (tp + fp) if tp + fp > 0 else 0.0
    r = tp / (tp + fn) if tp + fn > 0 else 0.0
    b2 = beta * beta
    denom = b2 * p + r
    f = (1.0 + b2) * p * r / denom if denom > 0 else 0.0
    return r, p, f


def roc_auc(scores, y):
    scores = np.asarray(scores, dtype=float)
    y = np.asarray(y, dtype=int)
    pos, neg = scores[y == 1], scores[y == 0]
    if pos.size == 0 or neg.size == 0:
        return 0.5
    diff = pos[:, None] - neg[None, :]
    return float((np.sum(diff > 0) + 0.5 * np.sum(diff == 0)) / diff.size)


def average_precision(scores, y):
    scores = np.asarray(scores, dtype=float)
    y = np.asarray(y, dtype=int)
    n_pos = int(y.sum())
    if n_pos == 0:
        return 0.0
    order = np.argsort(-scores, kind="stable")
    s, lab = scores[order], y[order]
    tp = np.cumsum(lab)
    seen = np.arange(1, len(s) + 1)
    # a threshold sits between distinct scores, so only the last item of each tied run is a cut point
    cut = np.r_[s[1:] != s[:-1], True]
    prec, rec = tp[cut] / seen[cut], tp[cut] / n_pos
    return float(np.sum(np.diff(np.r_[0.0, rec]) * prec))


def best_threshold(scores, y, cost_fp, cost_fn):
    scores = np.asarray(scores, dtype=float)
    y = np.asarray(y, dtype=int)
    best_t, best_cost = np.inf, float(cost_fn * np.sum(y == 1))  # flag nothing
    for t in np.unique(scores)[::-1]:
        pred = scores >= t
        cost = float(cost_fp * np.sum(pred & (y == 0)) + cost_fn * np.sum(~pred & (y == 1)))
        if cost < best_cost - 1e-12:
            best_t, best_cost = float(t), cost
    return best_t, best_cost
