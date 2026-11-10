# k-NN, k-means and the decision stump

Three classical workhorses, each a few lines of numpy once you see the shape of the computation.

## Scale first, then measure distance

k-NN and k-means both live and die by distance, so a feature measured in thousands drowns one measured
in fractions. Standardise with **training** statistics only: computing the mean and std on the test set
(or on everything before the split) is a leak, and the same transform must be applied to anything you
predict later. Tree models do not care about scale; distance models do. That one sentence is a
frequent interview question.

## k-NN: no training, all the cost at prediction time

Find the k closest training points and vote. `k = 1` memorises the noise (low bias, high variance),
a big `k` smooths toward the majority class (high bias). The brute-force cost is O(n d) per query and
the memory is the whole training set; at scale you reach for an index (KD-tree in low dimensions,
approximate nearest neighbours in high ones). In high dimensions distances concentrate and "nearest"
loses meaning. Tie rules must be written down, which is why this Lab fixes them.

## k-means: alternate until stable

Assign each point to its nearest center, then move each center to its members' mean. Every round
cannot increase the inertia (sum of squared distances), so it converges, but only to a **local**
optimum that depends on the start; real implementations use several restarts and k-means++ seeding.
Empty clusters happen, so decide what they do. It assumes round, similar-sized clusters and needs
`k` chosen in advance (elbow, silhouette, or a business reason).

## The stump: where trees begin

A decision tree is a stump applied recursively. For one feature, try the midpoint between each pair of
neighbouring values, score the split by the **size-weighted** drop in Gini impurity `1 - sum(p^2)`, and
keep the best. Weighting matters: a split that peels off one lone point should not look as good as one
that cleans up half the data. Random forests average many such trees grown on bootstrap samples with
random feature subsets, which is why they cut variance but not bias.

**Interview signal:** knowing which models need scaling, why `k` trades bias for variance, why k-means
is only a local optimum, and how impurity-based splitting is computed in O(n log n) with a sort.
