# Worst Hop

An inference platform runs `n` services as a rooted tree: service `0` is the gateway, and every other service `i`
(for `i` from `1` to `n-1`) calls its parent service `p_i` over a link with latency `w_i`. Every parent has a
smaller index than its child (`p_i < i`).

The **hop distance** between two services is the sum of link latencies along the unique path between them. Find the
**largest hop distance over all pairs of services**.

**Input.** The first line has `n`. The next `n-1` lines each have `p_i w_i` for `i = 1 .. n-1`.

**Output.** One integer: the largest hop distance.

**Limits.** `2 <= n <= 2 * 10^5`, `0 <= p_i < i`, `1 <= w_i <= 10^9`. Time limit 1 second. The answer can exceed 32 bits.

**Example.**

```
5
0 3
0 5
1 4
1 6
```

prints `14`: the path from service 4 up through 1 and 0 and down to 2 costs `6 + 3 + 5 = 14`; the path between
services 3 and 4 costs only `4 + 6 = 10`.
