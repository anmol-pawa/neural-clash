# Merge intervals

Merge overlapping closed intervals `[start, end]`. Intervals that touch (`[1, 2]` and `[2, 3]`) merge too.

**Interview signal:** sort by start first, then sweep keeping the last merged interval. Ask about touching intervals and unsorted input before coding. O(n log n) from the sort.
