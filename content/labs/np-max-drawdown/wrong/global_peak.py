import numpy as np


def max_drawdown(prices):
    p = np.asarray(prices, float)
    if p.size == 0:
        return 0.0
    return float(((p.max() - p) / p.max()).max())
