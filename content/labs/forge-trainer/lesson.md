# Forge 8: mini-batches, early stopping and a training loop

The last piece before the Nest guardian: the loop that ties a model, an optimiser and data together, and knows when to stop.

## Mini-batches, done properly

Each **epoch** is one pass over the training set in a fresh random order, cut into batches. Three details matter:

- **Every example exactly once per epoch.** Sampling with replacement or silently dropping the ragged last batch biases what the model sees. Keep the short batch.
- **Reproducible shuffling.** Seed the generator from `(seed, epoch)`: the same run gives the same batches, and a *different* epoch gives a *different* order. Re-using one order every epoch makes the optimiser walk the same path again and again.
- **Weight the epoch loss by batch size**, or the short last batch counts too much.

## Early stopping

Training loss only goes down; validation loss goes down, then turns up when the model starts memorising. Early stopping watches the validation loss:

- keep the **best** value, and a **snapshot copy** of the weights at that moment (a reference would be overwritten by later steps);
- count epochs without improvement; stop when the count reaches `patience`;
- `min_delta` says how much better counts as better: noise is not progress;
- at the end **restore** the best weights. Stopping at epoch 40 when epoch 33 was best, and keeping epoch 40's weights, throws the benefit away.

Early stopping is a regulariser with a cost: you spent validation data to choose the stopping point, so quote final numbers on a separate **test** set.

## Verify like a professional

Check that `val_loss` of the restored model equals the best value you recorded (the strongest single test), that you stopped exactly `patience` epochs after the best, and that two runs with one seed agree to the last digit.

**Interview signal:** "your validation loss rises while training loss falls: what do you do?" Strong answers name overfitting, early stopping with restore-best, then more data, augmentation, regularisation and a smaller model, and mention using a held-out test set for the final number.
