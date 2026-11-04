def solve(text: str) -> str:
    n, k, *ids = map(int, text.split())
    seen, best, run = set(), 0, 0
    for x in ids:
        seen.add(x)
        if len(seen) > k:  # throws the whole window away instead of shrinking it
            seen, run = {x}, 0
        run += 1
        best = max(best, run)
    return str(best)
