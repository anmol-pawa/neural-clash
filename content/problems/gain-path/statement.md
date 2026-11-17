# Gain Path

A trained decision tree has `n` nodes numbered `0` to `n-1`; node `0` is the root. Every node `v` has an integer
**gain** (how much it improves the split criterion, and it may be negative) and up to two children. Children always
have a **larger index** than their parent.

A **path** is a non-empty sequence of distinct nodes in which each consecutive pair is joined by a tree edge. It may
start and end anywhere and does not have to pass through the root. Its **value** is the sum of the gains of its nodes.

**Input.** The first line has `n`. Then `n` lines, line `v` holding `gain[v] left[v] right[v]`, where a missing child is
written as `-1`.

**Output.** The largest value of any path.

**Limits.** `1 <= n <= 2 * 10^5`, `-1000 <= gain <= 1000`. Time limit 1 second (use 64-bit sums if you like).

**Example.**

```
5
-10 1 2
9 -1 -1
20 3 4
15 -1 -1
7 -1 -1
```

prints `42`: the path `15 -> 20 -> 7` bends at node 2 and never touches the root.
