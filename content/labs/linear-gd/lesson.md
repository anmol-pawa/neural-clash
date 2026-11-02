# Linear model and gradient descent

Your companion starts as the simplest creature: a weight vector. The prediction is `y_hat = X @ w`
and the loss is the mean squared error `L = (1/N) * sum((y_hat - y)^2)`.

Derivation: with residual `r = X @ w - y`, `dL/dw = (2/N) * X.T @ r`. Check the shapes: `X.T` is
`(D, N)`, `r` is `(N,)`, so the gradient is `(D,)`, the same shape as `w`.

A gradient step moves *against* the gradient: `w <- w - lr * grad`.

Trust, but verify: the tests compare your gradient with central finite differences.

## Train it, then score it

`fit` is the loop every optimiser later hides: measure the loss and gradient at the current weights,
record the loss, take a step. Record the loss *before* the step so `history[0]` is the untrained
creature's loss.

Training loss only says how well the creature memorised. `r2_score` measures a fit on data it
never trained on: `1 - SS_res / SS_tot`, where `SS_tot` is the error of always predicting `mean(y)`.
`1.0` is perfect and `0.0` is no better than the mean. In the game, the R² on a hidden test set
becomes your companion's Attack.
