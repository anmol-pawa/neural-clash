# Fast Lanes: editorial

**Pattern.** Shortest path on a layered graph (state = position plus a small resource counter).

**Brute force.** Relax every link on every layer until nothing improves (Bellman-Ford over
`(lanes used, service)`), O(k n m) in the worst case. It validates the fast solution on tiny graphs, but
at `n = 2 * 10^4` it is far too slow.

**Key observation.** Standing on service `v` with 3 lanes left is a different situation from standing on
it with none left. So "service" is not enough state: use `(service, lanes used)`. That makes `k + 1`
copies of the graph. A normal link stays in the same layer and costs `w`; an express link goes from layer
`j` to layer `j + 1` and costs `0`. All costs are non-negative, so Dijkstra applies. The answer is the
best distance to service `n` over all layers (using fewer lanes is allowed).

**Complexity.** `(k + 1) n` states and `2 (k + 1) m` transitions: O(k (n + m) log(k n)) time with a heap,
O(k n + m) memory.

**Pitfalls.**
- Waiving the heaviest edges of one shortest path is wrong: the best route with lanes can be a different
  route that is longer without them.
- One distance per service loses information: a cheap arrival with lanes spent can hide a pricier arrival
  with lanes still in hand, which would have gone on to win.
- Path sums reach about `2 * 10^13`: use `long long`.
- Skip stale heap entries (`d > dist`) or the loop does redundant work.
- Scanning for the next state instead of using a heap is O(V^2) with `V = (k+1) n`.

**Follow-ups.** With negative weights Dijkstra breaks (discuss Bellman-Ford). If `k` were as large as `n`,
the layers would blow up: discuss why this is a different problem. Production routing: the same layering
models "at most k cross-region hops" or "at most k paid calls".
