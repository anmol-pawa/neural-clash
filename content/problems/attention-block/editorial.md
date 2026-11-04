# Attention Block: editorial

**Pattern.** Reduce a 2D problem to many 1D ones: row-by-row histograms, then a monotonic stack for the largest
rectangle in each histogram.

**Brute force.** Try every pair of rows and every pair of columns and test the rectangle with a 2D prefix sum:
O(R^2 C^2). About 5 * 10^12 checks at 1500 x 1500. A middle option (for every bottom-right cell, scan upward while
tracking the narrowest row run) is O(R^2 C) and still too slow at the limit, though it feels clever.

**Key observation.** Any all-allowed rectangle has a bottom row. If, for that row, you know for every column how many
allowed cells sit directly above (and including) it, the rectangle is a set of consecutive columns, and its height is
the smallest of those column heights. So each bottom row gives a histogram, and the best rectangle with that bottom
row is the largest rectangle inside the histogram.

**Histogram step.** Keep a stack of column indices whose heights are increasing. When a column no longer than the top
arrives, the top can never extend further right: pop it, take its height, and its width runs from just after the new
top of the stack to just before the current column. A sentinel height 0 after the last column flushes the stack.
Every column is pushed and popped once, so one histogram costs O(C).

**Updates.** `height[j] = mask[i][j] ? height[j] + 1 : 0`, so moving to the next row is O(C).

**Complexity.** O(R * C) time, O(C) extra space.

**Pitfalls.** Treating it as a largest-square problem (the neighbour DP answers a different question). Using `>`
instead of `>=` when popping is fine for the answer, but forgetting the sentinel loses rectangles that reach the right
edge. Forgetting to reset a height to `0` on a blocked cell. 32-bit area is safe here (at most 2.25 * 10^6) but
`long long` costs nothing.

**Follow-ups.** Return the rectangle's corners. Count how many all-allowed rectangles exist (the stack gives that too,
with a different bookkeeping). Allow a limited number of blocked cells. Handle a mask that changes (a streaming
sliding window). In practice: attention kernels like block-sparse patterns precisely because contiguous allowed blocks
map to efficient tiles, and this is the planning query behind it.
