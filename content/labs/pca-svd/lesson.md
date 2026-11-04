# PCA via SVD

Principal component analysis finds the directions along which a cloud of points varies most. With the data matrix `X` of shape `(n, d)`:

1. Centre it: `Xc = X - mean(X, axis=0)`.
2. Take the thin SVD `Xc = U @ diag(s) @ Vt`. The rows of `Vt` are the principal directions (unit length, mutually orthogonal), ordered by singular value.
3. The sample variance along direction `i` is `s[i]**2 / (n - 1)`.

Implement:

- `pca_fit(X, k)` returns `(mean, components, variances)` with shapes `(d,)`, `(k, d)`, `(k,)`.
- `pca_transform(X, mean, components)` projects to `(n, k)` scores.
- `pca_inverse(Z, mean, components)` maps scores back to `(n, d)`.
- `explained_ratio(X, variances)` returns each variance divided by the **total** variance of `X` (all `d` directions, not just the `k` kept).

**Sign convention.** A singular vector and its negative are equally valid, so libraries pick arbitrarily. To make answers comparable, flip each component so its largest-magnitude entry is positive.

**Interview signal:** forgetting to centre, dividing by `n` vs `n - 1`, and confusing the rows of `Vt` with the columns of `U` are the classic slips. Say aloud why the SVD of `Xc` is preferred to forming `Xc.T @ Xc` (squaring the condition number).
