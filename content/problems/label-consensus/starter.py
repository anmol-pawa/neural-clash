# Read the annotator labels from `text` (first number n, then n labels).
# Return, as a string, the label given by strictly more than n / 2 annotators, or "-1".
def solve(text: str) -> str:
    n, *labels = map(int, text.split())
    # TODO: counting every label against every other is O(n^2).
    # Can you find the only possible winner in one pass, then confirm it?
    return "-1"
