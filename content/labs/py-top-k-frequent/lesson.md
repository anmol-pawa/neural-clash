# Top-k frequent words

Count words, then return the `k` most frequent. Ties break alphabetically, so the answer is deterministic.

**Interview signal:** `collections.Counter`, a sort key that combines two criteria (negate the count instead of reversing), and stating the cost: O(n + u log u) with `u` unique words, or O(n + u log k) with a heap. Say which you chose and why.
