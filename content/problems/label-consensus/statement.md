# Label Consensus

Several annotators each give one label (a non-negative integer id) to the same example. A label **wins** only if it
is given by **strictly more than half** of the annotators.

**Input.** The first line has `n`. The second line has `n` integers, `0 <= label <= 10^9`.

**Output.** The winning label, or `-1` if no label has a strict majority.

**Limits.** `1 <= n <= 2 * 10^5`. Time limit 1 second.

**Example.**

```
7
3 3 4 3 1 3 4
```

prints `3`: label 3 appears four times out of seven. For `4` annotators labelling `1 1 2 2` it prints `-1`: a tie is
not a majority.
