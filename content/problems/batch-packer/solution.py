def fits(lengths, batches, cap):
    """Can the sequences be split, in order, into at most `batches` runs whose sums are all <= cap?"""
    used, run = 1, 0
    for x in lengths:
        if run + x > cap:  # start a new batch
            used += 1
            run = 0
        run += x
    return used <= batches


def solve(text: str) -> str:
    n, b, *lengths = map(int, text.split())
    lo, hi = max(lengths), sum(lengths)  # no batch is smaller than the longest sequence; one batch always works
    while lo < hi:  # smallest cap for which fits() is true (fits is monotone in cap)
        mid = (lo + hi) // 2
        if fits(lengths, b, mid):
            hi = mid
        else:
            lo = mid + 1
    return str(lo)
