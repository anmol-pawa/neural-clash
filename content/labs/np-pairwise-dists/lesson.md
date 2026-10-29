# Pairwise distances

`X` is (n, d) and `Y` is (m, d); return the (n, m) matrix of Euclidean distances, with no Python-level loop.

**Interview signal:** broadcasting `(n,1,d) - (1,m,d)` is correct but allocates n*m*d. The expansion `|x|² + |y|² - 2x·y` uses one matmul, but rounding can make a squared distance slightly *negative* (identical points), and `sqrt` of that is NaN. Clip at zero.
