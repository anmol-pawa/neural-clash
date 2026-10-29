# Running mean and variance

`RunningStats` accepts values one at a time with `add(x)` and reports `mean()` and the sample variance `variance()` (divide by `n - 1`; `0.0` when fewer than two values). It must stay accurate when values are huge and close together.

**Interview signal:** Welford's update. The textbook `E[x²] - E[x]²` cancels catastrophically (the same reason a softmax needs the max subtracted); be able to say why.
