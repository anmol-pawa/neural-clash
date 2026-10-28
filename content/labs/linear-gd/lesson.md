# Linear model and gradient descent

Your companion starts as the simplest creature: a weight vector. The prediction is `y_hat = X @ w`
and the loss is the mean squared error `L = (1/N) * sum((y_hat - y)^2)`.

Derivation: with residual `r = X @ w - y`, `dL/dw = (2/N) * X.T @ r`. Check the shapes: `X.T` is
`(D, N)`, `r` is `(N,)`, so the gradient is `(D,)`, the same shape as `w`.

A gradient step moves *against* the gradient: `w <- w - lr * grad`.

Trust, but verify: the tests compare your gradient with central finite differences.
