def solve(text: str) -> str:
    n, *label = map(int, text.split())
    # Boyer-Moore vote: a strict majority label survives pairing off distinct labels.
    candidate, votes = -1, 0
    for x in label:
        if votes == 0:
            candidate = x
        votes += 1 if x == candidate else -1
    # The vote only names the one possible winner; confirm it really has more than half.
    count = sum(1 for x in label if x == candidate)
    return str(candidate if count * 2 > n else -1)
