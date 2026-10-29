def flatten(nested):
    out = []
    for item in nested:
        if isinstance(item, (list, tuple)):
            out.extend(item)
        else:
            out.append(item)
    return out
