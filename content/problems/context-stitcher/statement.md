# Context Stitcher

A retrieval step returns `n` chunks of a long document. Chunk `i` covers the token positions
`l_i` to `r_i`, both ends included. Before building the prompt you stitch chunks together: two
chunks join when they share a position **or** when one ends exactly one position before the other
begins (no gap between them). Joining repeats until no two ranges can join.

Print how many stitched ranges remain and how many token positions they cover in total.

**Input.** The first line has `n`. Each of the next `n` lines has `l r` with
`0 <= l <= r <= 10^9`. Chunks come in no particular order.

**Output.** Two lines: the number of ranges, then the total number of covered positions.

**Limits.** `1 <= n <= 2 * 10^5`. Time limit 1 second.

**Example.**

```
4
8 10
1 3
2 4
5 6
```

prints

```
2
9
```

Chunks `1..3`, `2..4` and `5..6` stitch into `1..6` (6 positions), because `5` follows `4`
directly. `8..10` stays apart (3 positions).
