# Maximum drawdown

Given a 1-D array of positive `prices`, return the maximum drawdown: the largest value of `(peak - price) / peak`, where `peak` is the highest price seen **so far**. Return `0.0` if the series never falls (or is empty).

**Interview signal:** `np.maximum.accumulate` gives the running peak in one call. A global `max` instead of the running one counts a fall *before* the peak, which is not a drawdown. The same trick builds running best-so-far curves for hyper-parameter searches.
