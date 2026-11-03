# Batch Packer

A training job has `n` sequences with token lengths `len[0..n-1]`. They must be fed in the given
order. Split them into **at most** `b` batches, each a run of consecutive sequences. The cost of a
batch is the sum of its lengths, and the job is as slow as its most expensive batch. Print the smallest
possible value of the largest batch cost.

**Input.** The first line has `n` and `b`. The second line has `n` integers, `1 <= len <= 10^9`.
`1 <= b <= n`.

**Output.** One integer (it can exceed 32 bits).

**Limits.** `1 <= n <= 2 * 10^5`. Time limit 1 second.

**Example.**

```
5 2
7 2 5 10 8
```

prints `18`: split as `7 2 5 | 10 8` (costs 14 and 18). No two-batch split does better.
