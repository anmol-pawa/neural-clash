# MLE, MAP and the bootstrap

Training a model is estimation. This Lab builds the three estimators behind most of the loss
functions and error bars you will meet.

## Maximum likelihood

Pick the parameters that make the observed data most probable. For `x_i ~ Normal(mu, sigma^2)` the
negative log-likelihood is

`NLL = n ln(sigma) + n/2 ln(2 pi) + sum((x_i - mu)^2) / (2 sigma^2)`.

Set the derivatives to zero: `mu` is the sample mean and `sigma^2` is the mean squared deviation with
divisor **n**. The familiar `n - 1` version is the *unbiased* estimator, a different goal: the MLE
is slightly biased low, and the bias vanishes as `n` grows. Both terms of the NLL matter. The squared
term punishes a tiny `sigma` (the data would be far away), the `ln(sigma)` term punishes a huge one.
This is also why minimising squared error *is* maximum likelihood under Gaussian noise.

## MAP: add a prior

With a `Beta(a, b)` prior on a coin's bias `p` and `k` heads in `n` flips, the posterior is
`Beta(k + a, n - k + b)`. The MAP estimate is its **mode**, `(k + a - 1) / (n + a + b - 2)`. With
`a = b = 1` (a flat prior) it equals the MLE `k / n`; a larger `a = b` pulls the estimate toward 0.5,
which is exactly what L2 regularisation does to weights (a Gaussian prior). Do not confuse the mode
with the posterior mean `(k + a) / (n + a + b)`: they differ, and which one you report is a decision.

## The bootstrap

Resample your data with replacement `B` times, compute the statistic on each resample, and treat the
spread of those statistics as the sampling distribution. The indices are passed in, so the function
is deterministic. A percentile interval with coverage `1 - alpha` takes the `alpha/2` and
`1 - alpha/2` percentiles. It needs no formula for the standard error, so it works for medians and
for metrics like AUC, but it is poor for tiny samples and for statistics that depend on extremes
(such as the maximum).

**Interview signal:** stating that MSE is MLE under Gaussian noise, that L2 is a Gaussian prior, why
`n` and `n - 1` differ, and how you would put a confidence interval on a model's test accuracy.
