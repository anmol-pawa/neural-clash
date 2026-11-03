# Label Consensus: editorial

**Pattern.** Majority element (Boyer-Moore vote), with a hash-map counting solution as the baseline.

**Brute force.** Count every label against every other: O(n^2), roughly 4 * 10^10 comparisons at the limit.

**Hash-map baseline (O(n) time, O(n) space).** Count each label, then return the one whose count exceeds `n / 2`.
This is a fully acceptable answer in an interview. State the space cost, then offer to do better.

**Key observation.** Pair off two *different* labels and throw both away. A strict majority label outnumbers all
the others combined, so it can never be cancelled completely: it is the only label that can survive.

**Algorithm (O(n) time, O(1) space).** Keep a `candidate` and a `votes` counter. For each label: if `votes == 0`
take it as the candidate; add one when it matches, subtract one when it does not. The survivor is the only
*possible* winner. A **second pass** counts it and checks `2 * count > n`; otherwise print `-1`.

**Complexity.** Two passes: O(n) time, O(1) extra space.

**Pitfalls.** Skipping the confirmation pass (the survivor of `1 2 3` is `3`, which is no majority). Reporting the
most common label even when it has only a plurality. Using `>= n / 2` (a tie is not a majority) or integer
division with odd `n`. Reading labels into 32-bit ints.

**Follow-ups.** Elements appearing more than `n / 3` times: Misra-Gries with two candidates. Streaming labels:
the same counter works online, but confirming needs a second pass or a stored count. Weighted annotators:
replace `+1` / `-1` with weights. In ML terms this is the consensus rule used to aggregate noisy labels before
training; real pipelines usually use annotator-quality models rather than a hard majority.
