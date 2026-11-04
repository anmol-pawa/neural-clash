# `text` holds n and b on the first line, then n sequence lengths.
# Split them, keeping their order, into at most b consecutive batches.
# Return, as a string, the smallest possible value of the largest batch total.
def solve(text: str) -> str:
    n, b, *lengths = map(int, text.split())
    # TODO: the answer lies between max(lengths) and sum(lengths). How could you test one candidate cheaply?
    return "0"
