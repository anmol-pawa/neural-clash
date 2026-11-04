from collections import Counter


def solve(text: str) -> str:
    n, *label = map(int, text.split())
    return str(Counter(label).most_common(1)[0][0])
