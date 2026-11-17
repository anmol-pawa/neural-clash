# Strongest Chain: editorial

**Pattern.** Tree DP: a bottom-up pass where each node reports one number to its parent and uses two numbers
locally (the "path through a node" family).

**Brute force.** Try every pair of endpoints and add the scores along the tree path between them: O(n^2) pairs,
each costing up to O(depth). It is the specification for the small tests only.

**Key observation.** Every path has a unique highest node (closest to the root). From that node the path goes down
into at most two different child subtrees. So the answer is the maximum, over nodes `v`, of the best path whose top
is `v`.

**State.** `gain[v]` = the best sum of a chain that starts at `v` and only goes downwards. Because a chain may stop
anywhere, `gain[v] = value[v] + max(0, best child gain)`. A child chain with a negative total is simply not taken.

**Transition.** The best path with top `v` is `value[v] + g1 + g2`, where `g1 >= g2` are the two largest *positive*
child gains (missing or non-positive ones count as 0). Keep a running answer over all `v`. Note that the chain
passed up to the parent may use only **one** child (a path cannot fork), while the answer at `v` may use two.

**No recursion.** The input guarantees `parent[i] < i`, so walking `i` from `n - 1` down to `0` visits every child
before its parent. That avoids a 2*10^5-deep call stack on a chain-shaped tree. If the guarantee were dropped you
would do an iterative post-order or a BFS order reversed.

**Complexity.** O(n) time, O(n) space. Starting a traversal from every node, or checking all pairs, is O(n^2) and
fails the performance tests.

**Pitfalls.** Initialising the answer to `0` (an all-negative tree must answer with the single largest score).
Adding negative child gains. Letting the value passed upwards use both children. Using `int`: sums reach about
`2 * 10^14`. Recursing on the chain-shaped tests.

**Follow-ups.** Also output one optimal chain (remember which children gave `g1` and `g2`). Require at least `k`
nodes. Forbid chains through a given node. Weighted edges instead of node scores. Same idea on a decision tree
with per-leaf utility: the best "prediction path" a feature subset could take.
