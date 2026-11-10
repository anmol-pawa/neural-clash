# Ranking metrics and calibration error

Search, recommendation and retrieval-augmented generation all return an ordered list. Ranking metrics
ask how good the top of that list is; calibration asks whether the probabilities mean what they say.

## Precision@k and recall@k

Look only at the first `k` results. **Precision@k** is the share of them that are relevant. It divides by
`k` even when the system returned fewer, so a system cannot win by returning almost nothing.
**Recall@k** divides by the total relevant items that exist in the corpus, a number you need labels for.
As `k` grows, recall can only rise and precision tends to fall. For a RAG retriever, recall@k is the
ceiling on answer quality: if the right passage is not in the context, no prompt will rescue it.

## MRR: how far down is the first good answer?

For each query take `1 / rank` of the first relevant result (0 if none), then average. It rewards putting
one good answer first and ignores everything after it, which suits "find the one right page" tasks and
misleads on tasks where several results matter.

## nDCG: graded relevance with position discounts

When relevance is graded (0 to 3), use discounted cumulative gain: each result contributes
`(2^grade - 1) / log2(rank + 1)`, so strong results count much more, and later positions count less.
Divide by the **ideal** DCG, the same sum for the best possible ordering of everything you could have
returned, to get a score in [0, 1] that is comparable across queries. Two traps: building the ideal from
only the retrieved items (hides missed great results), and dividing by an ideal of zero when a query has
no relevant items. Linear gain is a legitimate variant, but name which one you use.

## Calibration and ECE

A model is calibrated when, among cases scored 0.8, about 80% are positive. Expected calibration error
bins the predictions, and sums each bin's `|accuracy - mean confidence|` weighted by the bin's share of
the data. Weighting matters (an empty-ish bin should not dominate), absolute values matter (over- and
under-confidence must not cancel), and the bin count is a choice that changes the number. High AUC with
poor calibration is common: ranking quality and probability quality are different properties. Fixes
include temperature scaling and isotonic regression on a held-out set.

## Interview angle

"How do you evaluate a search ranker offline?" Offer nDCG@k with graded labels, MRR for known-item
search, recall@k for the retriever stage, then say the online metric (clicks, task success) is the real
judge. "Is a high-AUC model safe to threshold at 0.5?" Not without checking calibration.
