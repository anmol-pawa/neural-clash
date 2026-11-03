# Peak Window

A monitoring service records `n` load readings. For every window of `k` consecutive readings, report the
largest reading in that window. Windows slide one reading at a time, so there are `n - k + 1` of them.

**Input.** The first line has `n` and `k`. The second line has `n` integers, `-10^9 <= value <= 10^9`.
`1 <= k <= n`.

**Output.** `n - k + 1` integers separated by spaces: the maximum of each window, left to right.

**Limits.** `1 <= n <= 2 * 10^5`. Time limit 1 second.

**Example.**

```
8 3
1 3 -1 -3 5 3 6 7
```

prints `3 3 5 5 6 7`: the windows are `1 3 -1`, `3 -1 -3`, `-1 -3 5`, `-3 5 3`, `5 3 6`, `3 6 7`.
