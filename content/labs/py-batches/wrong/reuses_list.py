def batches(items, size):
    if size <= 0:
        raise ValueError("size must be positive")
    chunk = []
    for x in items:
        chunk.append(x)
        if len(chunk) == size:
            yield chunk
            chunk.clear()
    if chunk:
        yield chunk
