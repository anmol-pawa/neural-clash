# Pipeline Order

A data pipeline has `n` stages labelled `1..n`. There are `m` dependency pairs `a b`: stage `a` must
finish before stage `b` starts. Stages run one at a time. Among all valid run orders, print the
**lexicographically smallest** one (compare the sequences of labels from the first position). If no valid
order exists because the dependencies form a cycle, print `-1`.

**Input.** The first line has `n` and `m`. The next `m` lines each have `a b`. Pairs may repeat. A pair
`a a` is a cycle.

**Output.** `n` labels separated by spaces, or `-1`.

**Limits.** `1 <= n <= 2 * 10^5`, `0 <= m <= 4 * 10^5`. Time limit 1 second.

**Example.**

```
4 3
3 1
4 1
2 4
```

prints `2 3 4 1`: stage 1 needs 3 and 4, stage 4 needs 2. The ready stages at the start are 2 and 3, and
2 is smaller. After 2 only 3 and 4 are ready, and 3 is smaller; then 4, then 1.
