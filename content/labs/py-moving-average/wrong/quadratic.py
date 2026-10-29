def moving_average(xs, w):
    if w <= 0:
        raise ValueError("window must be positive")
    return [sum(xs[i:i + w]) / w for i in range(len(xs) - w + 1)]
