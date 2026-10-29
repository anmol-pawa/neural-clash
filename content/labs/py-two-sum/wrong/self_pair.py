def two_sum(nums, target):
    seen = {}
    for j, x in enumerate(nums):
        seen[x] = j
        i = seen.get(target - x)
        if i is not None:
            return (i, j)
    return None
