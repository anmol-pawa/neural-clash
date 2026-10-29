import numpy as np


def max_drawdown(prices):
    p = np.asarray(prices, float)
    best = 0.0
    for i in range(len(p)):
        best = max(best, ((p[i] - p[i:]) / p[i]).max())
    return float(best)
