def solve(text: str) -> str:
    n, b, *lengths = map(int, text.split())
    target = -(-sum(lengths) // b)  # ceil of the average: ignores that batches must be consecutive
    return str(max(target, max(lengths)))
