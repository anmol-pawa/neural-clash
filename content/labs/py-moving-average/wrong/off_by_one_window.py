def moving_average(xs, w):
    if w <= 0:
        raise ValueError("window must be positive")
    if w > len(xs):
        return []
    total = sum(xs[:w])
    out = [total / w]
    for i in range(w, len(xs)):
        total += xs[i] - xs[i - w + 1]
        out.append(total / w)
    return out
