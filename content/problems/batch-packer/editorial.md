# Batch Packer: editorial

**Pattern.** Binary search on the answer, with a greedy feasibility check.

**Brute force (O(b * n^2)).** `dp[j][i]` = best largest-batch cost splitting the first `i` sequences
into `j` batches; transition over the last cut. Correct, and the way to validate the fast solution on
small inputs. It is far too slow for `n = 2 * 10^5`.

**Key observation.** Ask the easier question: "can I do it with every batch costing at most `cap`?"
Pack greedily: keep adding sequences to the current batch until the next would overflow, then start a new
batch. Greedy is optimal for the check because ending a batch later never hurts a later batch. If
the batch count is at most `b`, `cap` is feasible. Feasibility is **monotone** in `cap`, so the smallest
feasible `cap` can be found by binary search.

**Bounds.** The answer is at least `max(len)` (a sequence cannot be split) and at most `sum(len)` (one
batch). That is about 31 iterations of an O(n) check: O(n log(sum)).

**Pitfalls.** Starting the low bound at 0 or 1 makes the check accept a `cap` smaller than a single
sequence. Using 32-bit integers for the sum (it reaches 2 * 10^14). The "average" shortcut
`ceil(total / b)` ignores order and is only a lower bound. Off-by-one in the loop (`lo < hi` with
`hi = mid`, or `lo <= hi` with `hi = mid - 1`; stay consistent).

**Follow-ups.** The same shape solves "ship packages within D days" and "split array largest sum".
Sequences can be reordered: this becomes bin packing (NP-hard), so discuss first-fit-decreasing.
Minimise the number of batches for a given cap: that is just the greedy count.
