# Top-k per row

For each row of the score matrix `S` return the column indices of its `k` largest scores, ordered from largest to smallest. Assume `1 <= k <= S.shape[1]` and ties are broken by lower index.

**Interview signal:** say the trade-off out loud. `np.argpartition` finds the top-k in O(m) per row but makes no promise about their order, and it picks arbitrary columns among boundary ties; a stable `argsort` of the negated scores is O(m log m) but gives the exact, deterministic answer the spec asks for. Choose by whether m is large and whether ties matter.
