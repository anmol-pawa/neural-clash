import numpy as np


def max_drawdown(prices):
    peak, worst = 0.0, 0.0
    for x in prices:
        peak = max(peak, x)
        worst = max(worst, (peak - x) / peak)
    return float(worst)
