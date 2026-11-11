"""Starter file shown to the player."""
import numpy as np


def minibatches(n, batch_size, seed=0, epoch=0):
    """Return a list of index arrays that together cover 0..n-1 exactly once, in a shuffled order.
    order = np.random.default_rng([seed, epoch]).permutation(n), cut into chunks of batch_size
    (the last chunk may be smaller; nothing is dropped). Same (seed, epoch) -> same batches; another epoch -> another order."""
    raise NotImplementedError


class EarlyStopping:
    """Stop when validation loss has not improved for `patience` epochs, and remember the best weights."""

    def __init__(self, patience=5, min_delta=0.0):
        """Track best_loss (inf), best_epoch (-1), best_params (None), bad_epochs (0).
        An epoch is an improvement only if val_loss < best_loss - min_delta."""
        raise NotImplementedError

    def update(self, val_loss, params):
        """Call once per epoch (epochs are numbered 0, 1, 2 ... by call order).
        On improvement: store a COPY of every array in params, reset bad_epochs.
        Otherwise bad_epochs += 1. Return True when bad_epochs >= patience (stop now)."""
        raise NotImplementedError

    def restore(self, params):
        """Copy the best snapshot back into the live arrays, in place."""
        raise NotImplementedError


def fit(model, Xtr, ytr, Xva, yva, lr=0.1, batch_size=16, max_epochs=100, patience=5, seed=0):
    """Mini-batch SGD with early stopping.

    model offers loss_and_backward(X, y) -> loss, step(lr) and params() (a list of live arrays).
    Each epoch: go through minibatches(len(Xtr), batch_size, seed, epoch); for each batch call
    loss_and_backward then step(lr). The epoch's train loss is the example-weighted mean of the batch losses.
    Then val_loss = model.loss_and_backward(Xva, yva) (gradients ignored, no step), and early stopping decides.
    After the loop restore the best weights. Return a dict with train_losses, val_losses (one entry per epoch run),
    best_epoch and stopped_epoch (index of the last epoch that ran)."""
    raise NotImplementedError
