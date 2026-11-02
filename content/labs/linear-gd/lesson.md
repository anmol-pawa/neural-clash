# Linear model and gradient descent

Your companion starts as the simplest creature: a weight vector. The prediction is `y_hat = X @ w`
and the loss is the mean squared error `L = (1/N) * sum((y_hat - y)^2)`.

Derivation: with residual `r = X @ w - y`, `dL/dw = (2/N) * X.T @ r`. Check the shapes: `X.T` is
`(D, N)`, `r` is `(N,)`, so the gradient is `(D,)`, the same shape as `w`.

A gradient step moves *against* the gradient: `w <- w - lr * grad`.

Trust, but verify: the tests compare your gradient with central finite differences.

## Part 2: the training loop and the test metric

Training is just the step in a loop: compute loss and gradient, step, repeat. `fit_linear` starts at
`w = 0` and records the loss *before* each step, so `losses[0]` is the untrained loss and a healthy
run falls every epoch (at a small enough learning rate).

Then judge the model on data it never trained on. `r2_score` is `1 - SS_res / SS_tot`, where the
baseline predicts `mean(y)`: 1 is perfect, 0 is no better than the mean, below 0 is worse. This
held-out score is what powers your companion in battle (GDD 5.3).
