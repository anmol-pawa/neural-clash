# Gain Path: editorial

**Pattern.** Tree DP, bottom-up: "the best path bends at one highest node" (diameter family, with weights that can be negative).

**Brute force.** For every pair of nodes, climb to their meeting point and add the gains: O(n^2) pairs times a walk,
so O(n^3) for a chain. It is the specification for the small tests only.

**Key observation.** Every path has one node closest to the root, its *top*. Below the top the path is at most two
downward chains, one into each child. So the best path with top `v` is
`gain[v] + max(0, down[left]) + max(0, down[right])`, where `down[u]` is the best sum of a chain that starts at `u` and
only goes down. The `max(0, ...)` is the decision "skip a side that hurts": with negative gains, the best path
often stops early.

**Recurrence.** `down[v] = gain[v] + max(0, down[left], down[right])`. A chain that continues upward through `v` can use
only one child (a path cannot fork), which is why `down` takes a `max` while the bend takes a sum.

**Order.** The statement guarantees children have larger indices than parents, so one loop from `n-1` down to `0`
sees every child first. No recursion means no stack overflow on a 2*10^5-node chain, which is the usual failure of the
recursive version in an interview.

**Complexity.** O(n) time, O(n) space (O(1) extra if you store `down` in place).

**Pitfalls.** Starting `best` at 0 (an all-negative tree must return its least-negative single node). Returning
`down[0]` (that is a root-to-somewhere chain, not the best path). Adding a negative child. Recomputing `down` below every node
without memoising, which is O(n^2) on a deep tree. Using `int` is safe here (at most 2*10^8) but `long long` is the habit to build.

**Follow-ups.** Return the nodes of the path (store which child each `down` came from). Handle `k` children per node
(keep the two largest `down` values). Make it an unrooted tree given as an edge list (root it, then same DP). Constrain
the path to at most `L` nodes (this becomes much harder; discuss it rather than solve it). In ML terms: this is the
shape of "best subtree of a decision tree by summed split gain", and the same two-best-children pattern appears in
tree diameters and in pruning problems.
