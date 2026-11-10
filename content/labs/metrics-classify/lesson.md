# Precision, recall, AUC and the cost threshold

A classifier gives scores; a product needs a decision. This Lab builds the four measurements that sit
between those two, and shows why "accuracy" is rarely the one you want.

## Precision, recall and F-beta

Flag some items as positive. **Precision** is the share of flags that were right (`tp / (tp + fp)`);
**recall** is the share of real positives you caught (`tp / (tp + fn)`). They pull against each other:
flag more and recall rises while precision usually falls. F-beta folds them into one number with a
harmonic-style mean, `(1 + b^2) p r / (b^2 p + r)`; `beta = 2` says a miss is worse than a false alarm,
`beta = 0.5` says the reverse. Both ratios can have a zero denominator (nothing flagged, no positives):
decide what that returns and write it down. NaN poisons every average downstream.

## ROC-AUC: a ranking statement

AUC is the probability that a randomly chosen positive outscores a randomly chosen negative, with ties
worth one half. That reading explains its properties: it ignores the threshold, it is unchanged by any
monotone rescaling of the scores, and flipping the scores gives `1 - AUC`. It also does not care how many
negatives there are, which is exactly why it can look comfortable on a problem that is miserable in
practice.

## Average precision: the base rate shows up

Sweep the threshold from high to low and record precision at each recall step; the weighted sum is
average precision. Unlike ROC, precision depends on how many negatives compete, so adding 20x more
negatives leaves AUC alone and crushes AP. For rare-event problems (fraud, abuse, defects) AP or
precision at a fixed recall tells you what the on-call queue will feel like. Items with equal scores
share a threshold: you cannot cut between them, so your answer must not depend on input order.

## Choosing the threshold from costs

The right cut-off is a business decision, not 0.5. Give a false alarm a price and a miss a price, then
evaluate every distinct score as a cut and keep the cheapest. When misses cost ten times more, the
best threshold drops; when alarms are expensive, it rises; when the model is no better than chance,
"flag nothing" can win. Pick the threshold on validation data, report the metric on a held-out set, and
re-check it when the base rate drifts.

## Interview angle

Expect: "your model has 99% accuracy, is it good?" (base rate), "ROC or PR for this problem?" (class
imbalance and what the user sees), and "how would you set the threshold?" (costs, capacity of the review
queue, a recall floor). Say the numbers out loud, not just the names.
