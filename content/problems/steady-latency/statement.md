# Steady Latency

An inference service logs the latency of each request in milliseconds. Averages hide slow outliers, so
dashboards track the **median** of every window of `k` consecutive requests. Windows slide one request at a
time, so there are `n - k + 1` of them.

For a window of `k` values sorted ascending, the median is the value at position `(k - 1) / 2` counting from
0, rounded down. For odd `k` that is the middle value. For even `k` it is the **lower** of the two middle values.

**Input.** The first line has `n` and `k`. The second line has `n` integers, `-10^9 <= value <= 10^9`.
`1 <= k <= n`.

**Output.** `n - k + 1` integers separated by spaces: the median of each window, left to right.

**Limits.** `1 <= n <= 2 * 10^5`. Time limit 1 second.

**Example.**

```
7 4
5 1 4 4 9 2 2
```

prints `4 4 4 2`. The windows, sorted, are `1 4 4 5` (lower middle `4`), `1 4 4 9` (`4`), `2 4 4 9` (`4`)
and `2 2 4 9` (`2`).
