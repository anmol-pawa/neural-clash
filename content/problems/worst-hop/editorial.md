# Worst Hop: editorial

**Pattern.** Tree diameter by a bottom-up DP (the longest downward path, combined at the path's highest node).

**Brute force.** Search from every service and keep the largest distance: O(n^2). Fine for the small tests, about
4 * 10^10 steps at the limit.

**Key observation.** Every simple path in a rooted tree has exactly one highest node `v`. From `v` the path goes
down into at most two different child subtrees. So the answer is the maximum over `v` of
"the two best downward branches under `v`, added together".

**State.** `down[c] + w(c)` is the longest path that starts at the parent of `c`, steps to `c`, and keeps going
down. For each node keep the two largest such values among its children (`top1`, `top2`, both `0` if absent).

**Transition and order.** The best path bending at `v` costs `top1[v] + top2[v]`. Pushing `top1[v] + w(v)` into the
parent's top-two finishes the node. Because `p_i < i`, visiting `v = n-1 .. 0` handles every child before its
parent, so there is no recursion and no stack-depth risk on a 2 * 10^5 chain.

**Complexity.** O(n) time, O(n) space.

**Pitfalls.** Considering only paths through the root (the heaviest path can sit deep in a subtree). 32-bit sums:
`2 * 10^5` edges of `10^9` reach `2 * 10^14`. Recursing on a chain of 2 * 10^5 nodes (stack overflow). Keeping only
the single best child, which finds the deepest node instead of the longest path.

**Follow-ups.** Return the endpoints (store which child gave `top1`). Two BFS/DFS passes also find a diameter in a
tree with non-negative weights (farthest from any node, then farthest from that). Handle negative weights (the
two-pass trick fails; the DP still works if you allow a branch to be skipped). Find the tree's centre. In serving
terms: this is the worst-case latency budget between any two components, which sets a floor on how a health check or
a cross-region sync can be timed.
