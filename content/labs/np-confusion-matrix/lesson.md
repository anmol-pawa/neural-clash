# Confusion matrix

Count, for every pair `(true, predicted)`, how many samples fall in it: a `(k, k)` integer matrix with true classes on the rows. Both inputs are integer arrays of equal length with values in `0..k-1`.

**Interview signal:** `cm[t, p] += 1` with fancy indices counts a repeated pair **once** (buffered assignment). Use `np.add.at`, or flatten the pair to `t * k + p` and `np.bincount` it (the fast route).
