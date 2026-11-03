# Context Window: editorial

**Pattern.** Variable-size sliding window (two pointers) with a frequency map.

**Brute force (O(n^2)).** For each start, extend right while the distinct count is at most `k`.
Correct, and the right first answer to state; it fails the perf group.

**Sliding window (O(n)).** Move `right` one step at a time and count the new id. While the window
has more than `k` distinct ids, move `left` forward, decrementing counts and **erasing an id when its
count hits zero**. After the shrink the window is valid, so record `right - left + 1`. Each index
enters and leaves the window once, so the total work is linear even though there is a nested loop.

**Why it is correct.** Cheap spans are closed under shrinking: if `[l, r]` is cheap then so is every
sub-span. So when `left` is advanced past an invalid start it never needs to move back.

**Pitfalls.** Forgetting to erase zero counts (the map size never drops). Clearing the whole window
when it overflows instead of shrinking from the left. Using an array indexed by id (ids reach 10^9).

**Follow-ups.** Longest span with at most `k` distinct ids *replacing* up to `m` tokens. Return the
span itself. The stream is unbounded: keep only the window in memory.
