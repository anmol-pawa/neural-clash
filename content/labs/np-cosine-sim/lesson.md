# Cosine similarity matrix

Given `X` of shape `(n, d)`, return the `(n, n)` matrix whose `[i, j]` entry is the cosine of the angle between rows `i` and `j`. A zero row has no direction: define its similarity with everything as 0 (not NaN).

**Interview signal:** normalise the rows once, then a single matmul (this is the core of embedding search). Normalising *columns* is the classic axis slip.
