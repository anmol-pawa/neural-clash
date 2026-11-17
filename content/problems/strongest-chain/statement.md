# Strongest Chain

A decision tree has `n` nodes numbered `0` to `n - 1`, rooted at node `0`. Node `i` carries an integer **score**
`v[i]` (it may be negative). A **chain** is a path that follows tree edges, visits each node at most once, has at
least one node, and may start and end at any nodes. Its strength is the sum of the scores on it.

**Input.** The first line has `n`. The second line has the `n` scores. The third line has `n - 1` integers: `p[1]`
to `p[n-1]`, where `p[i]` is the parent of node `i`, and `p[i] < i` always holds. (For `n = 1` the third line is empty.)

**Output.** The largest chain strength.

**Limits.** `1 <= n <= 2 * 10^5`, `|v[i]| <= 10^9`. The tree may be a single long chain, so avoid unbounded
recursion. Time limit 1 second.

**Example.**

```
5
-3 4 5 -10 7
0 0 1 1
```

prints `13`: the chain `2 - 0 - 1 - 4` has strength `5 + (-3) + 4 + 7`. Dropping node 0 would lose the
connection between the two sides, and node 3 (score `-10`) is never worth including.
