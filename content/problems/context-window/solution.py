def solve(text: str) -> str:
    n, k, *ids = map(int, text.split())
    in_window = {}  # token id -> occurrences inside [left, right]
    best = left = 0
    for right, x in enumerate(ids):
        in_window[x] = in_window.get(x, 0) + 1
        # Invariant: after this loop the window holds at most k distinct ids.
        while len(in_window) > k:
            y = ids[left]
            in_window[y] -= 1
            if in_window[y] == 0:
                del in_window[y]
            left += 1
        best = max(best, right - left + 1)
    return str(best)
