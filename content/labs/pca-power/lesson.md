# PCA by power iteration

The SVD is a black box. Power iteration shows where a principal component comes from, using only matrix-vector products, which is how large-scale PCA is done when `d` is big and only a few components are needed.

For a symmetric positive semi-definite matrix `A` (such as a covariance matrix), repeat `v <- A @ v / ||A @ v||`. Components of `v` along eigenvectors with larger eigenvalues grow faster, so `v` converges to the top eigenvector at a rate set by the ratio `lambda2 / lambda1`. The eigenvalue is the Rayleigh quotient `v @ A @ v`.

To get the next component, **deflate**: `A <- A - lambda * outer(v, v)` removes the direction you found.

Implement:

- `power_iteration(A, iters=500)` returns `(eigenvalue, unit_vector)`. Start from `np.random.default_rng(0).normal(size=d)`.
- `deflate(A, lam, v)` returns the deflated matrix without modifying `A`.
- `top_k_eigs(A, k, iters=500)` returns `(values (k,), vectors (k, d))`.
- `pca_power(X, k)` returns `(mean, components, variances)` like the SVD lab, from the covariance matrix `Xc.T @ Xc / (n - 1)`.

**Sign convention:** flip each returned vector so its largest-magnitude entry is positive.

**Interview signal:** know that convergence is slow when the top two eigenvalues are close, that an all-ones start can be exactly orthogonal to the answer, and that deflation accumulates numerical error (production code uses Lanczos or randomised SVD).
