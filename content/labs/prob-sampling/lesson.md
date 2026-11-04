# Sampling from scratch

Every random number in an ML system starts as a uniform draw on `[0, 1)`. Turning that into the
distribution you actually need is the craft behind dropout masks, weight initialisation, data
augmentation, token sampling and Monte Carlo estimates. Here all randomness is passed in as arrays of
uniforms, so your function is a pure, testable transformation.

## Inverse transform

If `F` is a CDF and `U ~ Uniform(0, 1)`, then `F^-1(U)` has CDF `F`. For the exponential,
`F(x) = 1 - exp(-rate * x)`; solving for `x` gives `x = -ln(1 - u) / rate`. Use `log1p(-u)` so that
small `u` keeps its precision, and note that `u = 0` must map to `0`: the tempting `-ln(u)` is also a
valid exponential draw (since `1 - U` is uniform too) but it sends `u = 0` to infinity.

The same idea samples a **categorical**: the cumulative sum of the probabilities cuts `[0, 1)` into
buckets, and the bucket that contains `u` is the answer. A uniform that lands exactly on a boundary
belongs to the *next* bucket because buckets are half-open, `[cum[i-1], cum[i])`. Guard the tail: the
last cumulative value can be `0.9999999999999999`, so clip the index.

## Rejection sampling

When you can evaluate a density `f` but cannot invert its CDF, throw darts. Draw a proposal `x` from a
simple distribution, draw `u`, and keep `x` when `u * M <= f(x)`, where `M` bounds `f` over a uniform
proposal. The kept points follow `f`, and the acceptance rate is `1 / M` (for a normalised `f` on
`[0, 1]`). A tight envelope wastes little; a loose one wastes most of the work, and in high dimensions
the rate collapses, which is why MCMC exists.

## Box-Muller

Two independent uniforms become two independent standard normals: `r = sqrt(-2 ln u1)`,
`theta = 2 pi u2`, outputs `r cos(theta)` and `r sin(theta)`. The `2` matters for the variance, and
using the same trigonometric function twice would make the two outputs identical.

**Interview signal:** explaining why `F^-1(U)` works (the probability integral transform), when rejection
is a poor choice (a loose envelope or many dimensions), and checking a sampler by comparing
empirical moments with the theoretical ones.
