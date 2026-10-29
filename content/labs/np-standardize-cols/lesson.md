# Standardise columns

Standardise each column of `X` to mean 0 and population standard deviation 1 (`ddof=0`). A constant column has std 0: return zeros for it instead of NaN.

**Interview signal:** the axis (columns, `axis=0`), `keepdims` or broadcasting, and the divide-by-zero guard. In real pipelines you fit these statistics on the training split only; the lesson on leakage covers why.
