# Two sum

Given numbers and a target, return the indices `(i, j)` with `i < j` and `nums[i] + nums[j] == target`, or `None`. Exactly one answer exists whenever one does.

**Interview signal:** trade O(n²) pairs for one pass with a dict of value to index. Check for the complement *before* inserting the current number, which is what stops an element pairing with itself.
