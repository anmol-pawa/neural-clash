def batches(items, size):
    if size <= 0:
        raise ValueError("size must be positive")
    for i in range(0, len(items), size):
        yield list(items[i:i + size])
