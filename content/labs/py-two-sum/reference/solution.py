def two_sum(nums, target):
    seen = {}
    for j, x in enumerate(nums):
        i = seen.get(target - x)
        if i is not None:
            return (i, j)
        seen[x] = j
    return None
