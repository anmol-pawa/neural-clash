def flatten(nested):
    out = []
    stack = [iter(nested)]
    while stack:
        for item in stack[-1]:
            if isinstance(item, (list, tuple)):
                stack.append(iter(item))
                break
            out.append(item)
        else:
            stack.pop()
    return out
