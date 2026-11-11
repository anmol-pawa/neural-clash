import numpy as np


def minibatches(n, batch_size, seed=0, epoch=0):
    """Shuffled index batches covering 0..n-1 exactly once; the last batch may be smaller."""
    order = np.random.default_rng([seed, epoch]).permutation(n)
    return [order[i:i + batch_size] for i in range(0, n, batch_size)]


class EarlyStopping:
    def __init__(self, patience=5, min_delta=0.0):
        self.patience, self.min_delta = patience, min_delta
        self.best_loss = np.inf
        self.best_epoch = -1
        self.best_params = None
        self.bad_epochs = 0
        self._epoch = -1

    def update(self, val_loss, params):
        """Record one epoch. Returns True when training should stop."""
        self._epoch += 1
        if val_loss < self.best_loss - self.min_delta:
            self.best_loss = val_loss
            self.best_epoch = self._epoch
            self.best_params = [p.copy() for p in params]  # a snapshot, not a view
            self.bad_epochs = 0
        else:
            self.bad_epochs += 1
        return self.bad_epochs >= self.patience

    def restore(self, params):
        """Copy the best snapshot back into the live arrays, in place."""
        for p, best in zip(params, self.best_params):
            p[...] = best


def fit(model, Xtr, ytr, Xva, yva, lr=0.1, batch_size=16, max_epochs=100, patience=5, seed=0):
    """Mini-batch SGD with early stopping on validation loss.

    The model provides loss_and_backward(X, y) -> loss, step(lr) and params()."""
    stopper = EarlyStopping(patience)
    train_losses, val_losses = [], []
    for epoch in range(max_epochs):
        total = 0.0
        for idx in minibatches(len(Xtr), batch_size, seed, 0):
            loss = model.loss_and_backward(Xtr[idx], ytr[idx])
            model.step(lr)
            total += loss * len(idx)
        train_losses.append(total / len(Xtr))
        val_loss = model.loss_and_backward(Xva, yva)  # gradients are ignored here: no step follows
        val_losses.append(val_loss)
        if stopper.update(val_loss, model.params()):
            break
    stopper.restore(model.params())
    return {
        "train_losses": train_losses,
        "val_losses": val_losses,
        "best_epoch": stopper.best_epoch,
        "stopped_epoch": len(val_losses) - 1,
    }
