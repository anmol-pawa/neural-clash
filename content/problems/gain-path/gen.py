"""Seeded generator: python3 gen.py <group> <seed>  ->  one test input on stdout (stdlib only)."""
import os
import random
import sys

group, seed = sys.argv[1], int(sys.argv[2])
rng = random.Random(f"gain-path/{group}/{seed}")


def emit(gains, kids):
    """kids[v] = (left, right); children must have larger indices than v."""
    print(len(gains))
    for v, g in enumerate(gains):
        print(g, kids[v][0], kids[v][1])


def random_tree(n, lo, hi, chain_bias=0.0):
    gains = [rng.randint(lo, hi) for _ in range(n)]
    kids = [[-1, -1] for _ in range(n)]
    for v in range(1, n):
        # attach v under an earlier node that still has a free slot (prefer the latest one for deep trees)
        while True:
            p = v - 1 if rng.random() < chain_bias else rng.randrange(v)
            if -1 in kids[p]:
                break
            chain_bias = 0.0 if p == v - 1 else chain_bias
        kids[p][kids[p].index(-1)] = v
    return gains, [tuple(k) for k in kids]


if group == "sample":
    emit([-10, 9, 20, 15, 7], [(1, 2), (-1, -1), (3, 4), (-1, -1), (-1, -1)])
    sys.exit()
if group == "edge":
    cases = [
        ([-5], [(-1, -1)]),                                          # single negative node
        ([4], [(-1, -1)]),                                           # single positive node
        ([-3, -2, -1], [(1, -1), (2, -1), (-1, -1)]),                # all negative chain: best is the single -1
        ([1, -2, 3], [(1, 2), (-1, -1), (-1, -1)]),                  # negative middle: skip the -2 side, answer 4
        ([-1, 5, 6], [(1, 2), (-1, -1), (-1, -1)]),                  # best path bends at a negative root: 5-1+6=10
        ([2, -1, -1, 10], [(1, -1), (2, -1), (3, -1), (-1, -1)]),    # worth walking through negatives: 2-1-1+10=10
        ([10, 1, -20, -3, 8], [(1, 2), (-1, -1), (3, 4), (-1, -1), (-1, -1)]),  # a start below the root is better
        ([-1000, 1000, 1000], [(1, 2), (-1, -1), (-1, -1)]),         # extreme values
    ]
    g, k = cases[(seed - 1) % len(cases)]
    emit(g, k)
    sys.exit()
if group == "random":
    n = rng.randint(2, 12)
    if seed % 3 == 0:
        g, k = random_tree(n, -10, -1)             # all negative
    elif seed % 3 == 1:
        g, k = random_tree(n, -10, 10)
    else:
        g, k = random_tree(n, -4, 12, chain_bias=0.6)
    emit(g, k)
    sys.exit()
if group == "perf":
    n = int(os.environ.get("NC_PERF_N", 0)) or 200_000
    if seed == 1:
        # a straight chain: recursion-depth and rewalk killer; mostly positive with a few negatives
        gains = [rng.choice([-3, 1, 2, 3, 5]) for _ in range(n)]
        kids = [(v + 1 if v + 1 < n else -1, -1) for v in range(n)]
    else:
        gains, kids = random_tree(n, -1000, 1000, chain_bias=0.9)
    emit(gains, kids)
    sys.exit()
sys.exit(f"unknown group {group}")
