def lower_bound(a, x):
    for i in range(len(a)):
        if a[i] >= x:
            return i
    return len(a)
