# One-hot encoding

Turn integer class `labels` (length n, values in `0..k-1`) into an `(n, k)` float matrix with a single 1 per row. `k` is given: a batch may not contain every class, so never infer it from `labels.max()`.

Raise `ValueError` for a label outside `0..k-1` (negative indices would silently wrap in numpy).

**Interview signal:** fancy indexing `out[np.arange(n), labels] = 1`, and guarding the silent-wrap trap.
