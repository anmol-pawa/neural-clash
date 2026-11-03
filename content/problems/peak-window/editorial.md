# Peak Window: editorial

**Pattern.** Monotonic deque (sliding-window maximum).

**Brute force (O(n * k)).** Scan each window for its maximum. Correct, and the specification used to check
the fast solution; with `k` near `n / 2` it is about 10^10 steps.

**Key observation.** When a new reading `x` arrives, any older reading in the window that is `<= x` can never
be the maximum of a window again: `x` is at least as large and stays in every window that contains the older
one for longer. So keep only candidates whose values are **strictly decreasing** from front to back. The front
is then the current window maximum.

**Algorithm.** For each index `i`: pop from the back while the back value is `<= load[i]`; push `i`; if the
front index is `<= i - k` it left the window, so pop it; once `i >= k - 1`, print the front value. Store
indices, not values, so you can tell when the front expires.

**Complexity.** Each index is pushed once and popped at most once: O(n) time, O(k) space.

**Pitfalls.** Forgetting to evict the front (stale maximum). Storing values and being unable to expire them.
Using `<` instead of `<=` is still correct but keeps equal values (fine, just a longer deque). A running
maximum reset every `k` steps confuses overlapping windows. Reading 64-bit values with 32-bit ints.

**Follow-ups.** Window minimum: flip the comparison. Window median: two heaps with lazy deletion or an ordered
multiset. Maximum over a 2D sliding window: apply the idea along rows then columns. Streaming input: the same
deque works online with O(k) memory.
