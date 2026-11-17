# Fast Lanes

An inference request travels through `n` services numbered `1..n`. There are `m` one-way links; link
`u -> v` adds `w` milliseconds. The request starts at service `1` and must reach service `n`.

The platform team can switch on **at most `k` express lanes** for this request. An express lane waives the
latency of one link it crosses (that link costs `0`). You choose which links to waive, and the same
link crossed twice counts as two uses.

Print the smallest possible total latency, or `-1` if service `n` cannot be reached.

**Input.** The first line has `n`, `m`, `k`. Each of the next `m` lines has `u v w`
(`1 <= u, v <= n`, `0 <= w <= 10^9`). Links may repeat and may form cycles.

**Output.** One integer (it can exceed 32 bits).

**Limits.** `2 <= n <= 2 * 10^4`, `1 <= m <= 6 * 10^4`, `0 <= k <= 10`. Time limit 1.5 seconds.

**Example.**

```
4 4 1
1 2 10
2 4 10
1 3 3
3 4 50
```

prints `3`: take `1 -> 3 -> 4` and waive the expensive `3 -> 4` link, paying only the `3`. (Waiving one 10 on
`1 -> 2 -> 4` would still cost 10.)
