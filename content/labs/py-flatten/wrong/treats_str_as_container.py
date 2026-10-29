def flatten(nested):
    out = []
    for item in nested:
        if hasattr(item, "__iter__") or isinstance(item, str):
            out.extend(flatten(item))
        else:
            out.append(item)
    return out
