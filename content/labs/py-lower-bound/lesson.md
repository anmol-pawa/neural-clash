# Lower bound

Return the first index `i` such that `a[i] >= x` in a sorted list, or `len(a)` if every element is smaller. This is `bisect.bisect_left`, written by hand.

**Interview signal:** a loop invariant you can state (`lo` is never too small, `hi` is never too small) with a half-open range `[lo, hi)`, and the right-hand end: the answer may be `len(a)`. Most binary-search bugs are an inclusive/exclusive mix-up.
