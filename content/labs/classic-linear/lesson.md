# Linear and logistic models from scratch

Two models cover a surprising share of production ML and of interview whiteboards: least squares for
numbers, logistic regression for yes/no. This Lab builds both without a library, so you can say
exactly what `fit()` does.

## Least squares and the normal equations

Stack a column of ones onto `X` to make `A`, so the intercept is just another weight. Minimising the
squared error `||A theta - y||^2` and setting its gradient to zero gives `A^T A theta = A^T y`.
Solve that linear system (never form the inverse: it is slower and less accurate). Two checks are
worth knowing: the residuals are orthogonal to every column of `A`, and with an intercept they sum
to zero. When features are collinear, `A^T A` is singular; that is the cue for ridge or for dropping
a feature, and it is a favourite follow-up question.

## Ridge: a Gaussian prior on the weights

Minimise `||A theta - y||^2 + lam ||w||^2`: the normal equations gain `lam` on the diagonal, which
also makes the matrix invertible. In one centred dimension the slope shrinks by `Sxx / (Sxx + lam)`.
**Do not penalise the intercept**: it measures where the data sits, not how wiggly the model is, and
shrinking it would make a huge-`lam` model predict zero instead of the mean. Features should be
standardised first, or the penalty punishes a feature just for having small units.

## Logistic regression

`p = sigmoid(X w + b)`, loss = mean binary cross-entropy. Two numerical points matter more than
the algebra. The sigmoid must branch on the sign of `z` so `exp` never overflows. The loss should be
computed from the logits as `softplus(z) - y z`, not from `log(p)`, which hits `log(0)` the moment
the model is confidently wrong. The gradient is beautifully simple: `X^T (p - y) / n`, the same
shape as least squares with `p` in place of the prediction. A `lam/2 ||w||^2` term adds `lam w`.

**Interview signal:** deriving the normal equations, explaining why ridge needs a standardised
design matrix and an unpenalised bias, writing a stable sigmoid, and noting that logistic loss is
convex but has no closed-form solution (and no finite optimum on perfectly separable data without
regularisation).
