# Pipeline Order: editorial

**Pattern.** Topological sort (Kahn's algorithm) with a min-heap for the tie-break.

**Brute force (O(n! * m)).** Try permutations in lexicographic order and return the first one that
respects every pair. It is the specification, and it is how the fast solution is validated on tiny inputs.

**Key observation.** A stage can run when every prerequisite has finished, i.e. its unfinished-prerequisite
count is 0. Running a stage lowers the counts of the stages that depend on it. To get the lexicographically
smallest order, always run the smallest ready label: picking any larger ready stage first could only make the
first differing position bigger. Keep the ready labels in a min-heap.

**Cycle.** Stages on a cycle never reach count 0, so the order ends up shorter than `n`: print `-1`.
A self-loop `a a` is the smallest cycle; duplicate pairs just count twice and are decremented twice.

**Complexity.** Each stage enters and leaves the heap once and each pair is touched once:
O((n + m) log n) time, O(n + m) space.

**Pitfalls.** A FIFO queue gives a valid but not the smallest order. Forgetting the cycle check prints a
short answer. Scanning for the smallest ready stage is O(n^2). Using a DFS post-order needs the reverse and
does not give the smallest order directly.

**Follow-ups.** Largest order instead: a max-heap. "Which stages can run in parallel, and what is the
fewest number of rounds?" Process in levels (BFS layers). Detect and print one cycle: DFS with colours.
In a real build system the pairs arrive incrementally; discuss incremental cycle detection.
