# Train a linear model

Time to train your companion for real. A linear model with a bias predicts `y_hat = X @ w + b`. You write the training loop yourself: predict, measure the mean squared error, take both gradients, and step against them.

The bias gradient is `dL/db = (2/N) * sum(r)` where `r = y_hat - y`. Record the loss at the start of every epoch so the loss curve can be drawn later.

Then judge the model on data it has never seen. `evaluate` returns the test MSE and R squared. R squared compares your model with the lazy one that always predicts the mean of `y`: 1 is perfect, 0 is no better than lazy, below 0 is worse. In the game these test metrics become your companion's stats.
