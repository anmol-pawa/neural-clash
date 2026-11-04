# Steady Latency: editorial

**Pattern.** Ordered multiset with a median iterator (sliding-window median).

**Brute force (O(n * k log k)).** Copy each window, sort, read position `(k - 1) / 2`. Correct, and the
specification used to check the fast solution; with `k` near `n / 2` it is far beyond the time limit.
`nth_element` makes each window O(k), which is still O(n * k).

**Key observation.** The median is a fixed *rank*, not a fixed value. Keep the window sorted in a
`multiset`; then the median is the element at position `(k - 1) / 2`. When the window slides, one value enters
and one leaves, so that element's rank changes by at most one: a single iterator can follow it.

**Algorithm.** Build the multiset from the first `k` values and park `mid` at position `(k - 1) / 2`. For each
slide: insert the new value (equal keys land after existing ones); if it is smaller than `*mid`, it landed before
`mid`, so move `mid` back one. If the outgoing value is `<= *mid`, it sits at or before `mid`, so move `mid` forward
one *before* erasing; this also keeps `mid` valid when the outgoing copy is `mid` itself. Erase exactly one copy with
`erase(lower_bound(value))`.

**Complexity.** Each slide does one insert and one erase, both O(log k), and O(1) iterator moves: O(n log k) time,
O(k) space.

**Pitfalls.** `erase(value)` removes *every* copy, corrupting the window with duplicates. Erasing before moving
`mid` can invalidate it. Using `k / 2` instead of `(k - 1) / 2` gives the upper median for even `k`. An average is
not a median. Values fit in 32 bits here, but `long long` costs nothing and protects you if a follow-up sums them.

**Alternatives.** Two heaps (max-heap for the lower half, min-heap for the upper half) with lazy deletion and a
balance counter: same O(n log k), more bookkeeping, and it needs care to keep the sizes right when stale entries
sit at the tops. A Fenwick tree over compressed values with a rank query (binary descent) is O(n log n) and has no
iterator subtleties, which many people prefer under interview pressure.

**Follow-ups.** Sliding-window percentile (p99 latency): the same structure with a different rank, but the rank then
moves by more than one position, so use a Fenwick tree or an order-statistics tree. Streaming median with no
deletions: two heaps are enough. Approximate quantiles over huge streams: sketches (t-digest, KLL) trade exactness
for memory; say so when an interviewer asks about production dashboards.
