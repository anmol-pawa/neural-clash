from itertools import islice


def batches(items, size):
    if size <= 0:
        raise ValueError("size must be positive")
    it = iter(items)
    while chunk := list(islice(it, size)):
        yield chunk
