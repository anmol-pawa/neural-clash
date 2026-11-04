# `text` holds n and k on the first line, then n token ids.
# Return, as a string, the length of the longest contiguous span with at most k distinct ids.
def solve(text: str) -> str:
    n, k, *ids = map(int, text.split())
    # TODO: grow a window on the right, shrink it from the left while it has too many distinct ids.
    return "0"
