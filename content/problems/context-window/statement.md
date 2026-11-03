# Context Window

A model reads a stream of `n` token ids. A *span* is a run of consecutive tokens. A span is
*cheap* if it contains at most `k` distinct ids. Print the length of the longest cheap span.

**Input.** The first line has `n` and `k`. The second line has `n` integers (token ids,
`0 <= id <= 10^9`). `1 <= k`.

**Output.** One integer.

**Limits.** `1 <= n <= 2 * 10^5`. Time limit 1 second.

**Example.**

```
7 2
1 2 1 3 3 3 2
```

prints `4`: the span `1 3 3 3` and the span `3 3 3 2` each hold two distinct ids and are 4 long;
no cheap span of length 5 exists.
