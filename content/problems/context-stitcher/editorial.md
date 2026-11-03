# Context Stitcher: editorial

**Pattern.** Sort by start, then sweep: the classic interval-merge shape.

**Approach 1: mark positions (O(range)).** A boolean array over positions works for small ranges and
dies at 10^9 positions. Name it, then reject it on the limits.

**Approach 2: sort and sweep (O(n log n)).** Sort chunks by `l`. Keep the open range `[curL, curR]`.
A new chunk joins when `l <= curR + 1`, and the range grows to `max(curR, r)`. Otherwise close the
open range (count it, add `curR - curL + 1`) and open a new one. Close the last range after the loop.

**Approach 3: coordinate events (O(n log n)).** Turn chunks into +1/-1 events at `l` and `r + 1`,
sort them and walk a running depth; a range is a maximal stretch where depth is positive.
Equivalent, and it generalises to "how many chunks cover each position".

**Pitfalls.** Forgetting to sort (the sample passes only if you got lucky with input order).
Using `l <= curR` and missing touching chunks, which the statement says must join. Replacing
`curR` with `r` instead of `max(curR, r)` when a small chunk sits inside a big one. Not closing the
final range. Lengths are `r - l + 1` because both ends count.

**Follow-ups.** The chunks arrive as a stream: keep a balanced map from start to end and merge on
insert (O(log n) each). Each chunk has a relevance score and the prompt has a token budget: pick
chunks to maximise score, which turns this into weighted interval selection.
