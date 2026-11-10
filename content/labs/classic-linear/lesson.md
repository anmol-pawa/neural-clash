# Linear and logistic regression from scratch

Two models, one pattern: define a loss, take its gradient, move downhill. Everything deeper in this
game (the neuron, the multilayer net) is this Lab with more layers.

## Least squares and the normal equations

Append a column of ones so the intercept is an ordinary weight, then minimise
`sum((y - A theta)^2)`. Setting the gradient to zero gives `(A^T A) theta = A^T y`. Solve that linear
system with `np.linalg.solve`; forming `(A^T A)^-1` explicitly is slower and less accurate, and a
nearly collinear `A^T A` is where the trouble starts (the condition number squares). In an interview,
say when you would *not* use it: many features (O(d^3)), or data too big to hold, where gradient
descent or a QR/SVD solve is the answer.

## Ridge: a Gaussian prior in disguise

Add `lam * sum(w^2)` to the loss and the system becomes `(A^T A + lam I) theta = A^T y`. Two details
interviewers probe: the penalty makes the matrix invertible even with collinear columns, and the
**intercept is not penalised**, otherwise the fit would depend on where your labels happen to sit.
Features should be standardised first, or the penalty punishes large-scale features unfairly.

## Logistic regression

The model is `p = sigmoid(Xw + b)` and the loss is mean cross-entropy. Two numerical traps: a naive
sigmoid overflows for very negative `z`, and `log(p)` is `-inf` once `p` rounds to 0. Use the
`exp(-|z|)` form and write the loss as `log(1 + e^z) - y z` (`np.logaddexp`). The gradient is the
friendliest in machine learning: **prediction minus label**, times the inputs, averaged over the batch.
This Lab checks it against finite differences, exactly as you will for every layer later.

**Interview signal:** deriving `p - y`, naming the stable forms, explaining why separable data
drives the weights to infinity without regularisation, and choosing a learning rate.
