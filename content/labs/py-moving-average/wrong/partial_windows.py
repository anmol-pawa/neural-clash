def moving_average(xs, w):
    if w <= 0:
        raise ValueError("window must be positive")
    out = []
    for i in range(len(xs)):
        chunk = xs[max(0, i - w + 1): i + 1]
        out.append(sum(chunk) / len(chunk))
    return out
