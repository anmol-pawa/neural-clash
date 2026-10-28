# Hot Tokens: editorial

**Pattern.** Frequency counting followed by top-k selection.

**Approach 1: count and sort (O(d log d)).** Count with a hash map, put the `d` distinct tokens in a
vector, sort by (count desc, id asc) and take `k`. Correct and often fast enough; mention it first.

**Approach 2: count and a size-k heap (O(n + d log k)).** Keep a min-heap of the best `k` seen so
far, with the *worst* candidate on top: lower count is worse, and on equal counts the larger id is
worse. Push every token, pop when the size passes `k`. The heap is smaller than the map when
`k << d`.

**Approach 3: bucket by count (O(n)).** Counts are at most `n`, so bucket tokens by count and walk
from the highest bucket down, sorting each bucket by id. Linear, with more code.

**Pitfalls.** The tie-break direction inverts when you move from "sort descending" to "heap with the
worst on top". A quadratic count per element passes small tests and fails the perf group.  Ids
reach 10^9, so keep them in `long long` (or `int` only if you never add them).

**Follow-ups.** The stream never ends: use a count-min sketch plus a heap, or the Misra-Gries
summary, and state the error bound. Ties are weighted by recency: change the heap key.
