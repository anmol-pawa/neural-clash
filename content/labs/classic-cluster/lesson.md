# k-NN, k-means and the tree split

Three classical algorithms, one idea each: **vote with the neighbours**, **move the centres**, **ask
the best yes/no question**. Writing them from scratch is how the details that interviewers probe
(ties, empty clusters, weighted impurity) stop being surprises.

## k-nearest neighbours

There is no training: the model *is* the data. To classify a point, find the `k` closest training
points and let them vote. Build the full `(m, n)` squared-distance matrix with broadcasting, since
squaring does not change the ordering. Decide the tie rules out loud: equal votes go to the smallest
label here, and equal distances go to the earlier training point (a stable sort). Remember the cost
model: `O(n d)` per query with no index, and distances stop discriminating in high dimension, so
standardise features first and expect k-NN to degrade as `d` grows. Small `k` gives a jagged,
high-variance boundary; `k = n` collapses to predicting the majority class.

## k-means (Lloyd's algorithm)

Alternate two steps: assign every point to its nearest centre, then move each centre to the mean of
its points. Each step can only lower the within-cluster sum of squares, so it always converges, but
only to a *local* optimum that depends on the starting centres. That is why practitioners restart
several times or use k-means++ seeding. Handle the empty cluster explicitly (here it keeps its old
centre), and never mutate the array the caller gave you.

## Decision-tree splits

For one numeric feature, try the midpoint between each pair of consecutive distinct values. Score a
split by the **size-weighted** child impurity: `(n_L G_L + n_R G_R) / n`. Weighting matters: a pure
child of two samples must not count as much as a mixed child of two hundred. Gini is
`1 - sum p_c^2`; entropy is the other common choice and rarely changes the tree much. A real tree
repeats this over every feature at every node and stops with a depth limit or a minimum gain, because
an unrestricted tree memorises the training set.

**Interview signal:** explaining the bias-variance effect of `k`, why k-means needs scaling and
restarts, and why a tree split uses weighted impurity. Following up with "how would you speed up
k-NN?" (KD-trees, approximate indexes, dimensionality reduction) is the usual next question.
