"""Seeded generator: python3 gen.py <group> <seed>  ->  one test input on stdout (stdlib only)."""
import os
import random
import sys

group, seed = sys.argv[1], int(sys.argv[2])
rng = random.Random(f"context-stitcher/{group}/{seed}")


def emit(chunks):
    print(len(chunks))
    for l, r in chunks:
        print(l, r)


if group == "sample":
    emit([(8, 10), (1, 3), (2, 4), (5, 6)])
    sys.exit()

if group == "edge":
    cases = [
        [(0, 0)],
        [(4, 4), (5, 5), (6, 6), (7, 7)],  # only touching: must fully stitch
        [(10**9, 10**9), (0, 0), (0, 10**9)],  # one chunk swallows the rest
        [(5, 9), (1, 2), (3, 4), (20, 30), (22, 24)],  # unsorted, adjacency and nesting
    ]
    emit(cases[(seed - 1) % len(cases)])
    sys.exit()

if group == "random":
    n = rng.randint(1, 12)
    span = rng.choice([10, 30, 60])
    chunks = []
    for _ in range(n):
        l = rng.randint(0, span)
        chunks.append((l, l + rng.randint(0, 4)))
    emit(chunks)
    sys.exit()

if group == "perf":
    n = int(os.environ.get("NC_PERF_N", 0)) or (100_000 if seed == 1 else 200_000)
    if seed == 1:
        # many disjoint chunks with gaps: the quadratic merge must scan them all
        chunks = [(3 * i, 3 * i) for i in range(n)]
        rng.shuffle(chunks)
    else:
        # a chain of adjacent chunks given in reverse: worst case for repeated pairwise merging
        chunks = [(2 * i, 2 * i + 1) for i in range(n)][::-1]
    emit(chunks)
    sys.exit()

sys.exit(f"unknown group {group}")
