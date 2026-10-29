# Row-wise softmax

Return the softmax of each row of the 2-D array `Z`.

**Interview signal:** subtract the row max first (softmax is shift-invariant), keep dims so broadcasting lines up, and normalise along the right axis. `exp(1000)` overflows to `inf`; the shift is what keeps training from producing NaN.
