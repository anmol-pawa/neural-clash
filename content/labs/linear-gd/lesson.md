# Linear model and gradient descent

Your companion starts as the simplest creature: a weight vector. The prediction is `y_hat = X @ w`
and the loss is the mean squared error `L = (1/N) * sum((y_hat - y)^2)`.

Derivation: with residual `r = X @ w - y`, `dL/dw = (2/N) * X.T @ r`. Check the shapes: `X.T` is
`(D, N)`, `r` is `(N,)`, so the gradient is `(D,)`, the same shape as `w`.

A gradient step moves *against* the gradient: `w <- w - lr * grad`.

Trust, but verify: the tests compare your gradient with central finite differences.

## Train it, then measure it

`fit` is the whole training loop in four lines: start at zero weights, and for each step record the
loss, compute the gradient, take a step. Recording the loss *before* the step means `history[0]` is
the untrained model's loss, which makes the curve honest.

A low training loss alone proves little. The score you will see in battle is measured on data the
model never trained on. `r2_score` turns that into one number: `1 - SS_res / SS_tot`. A model that
only predicts the mean scores 0; a biased model can score below 0. Learning rate matters too: too
large and the loss grows each step instead of falling.
