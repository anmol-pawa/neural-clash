# Batch iterator

`batches(items, size)` is a generator yielding consecutive lists of up to `size` items. The last batch may be shorter. It must work on any iterable, including a generator that can be read only once.

**Interview signal:** laziness (do not materialise the whole input), and yielding a *fresh* list per batch. Reusing and clearing one list is a classic aliasing bug that only shows when the caller keeps the batches.
