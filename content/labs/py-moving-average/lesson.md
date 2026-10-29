# Moving average

Return the average of every full window of width `w`: `len(xs) - w + 1` values. Use a running sum so each element is touched a constant number of times.

**Interview signal:** the sliding window (add the new element, subtract the one that left) instead of `sum(xs[i:i+w])` per position. Mention floating-point drift for very long streams.
