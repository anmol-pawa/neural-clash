def two_sum(nums, target):
    seen = set()
    for x in nums:
        if target - x in seen:
            return (target - x, x)
        seen.add(x)
    return None
