"""Seeded generator: python3 gen.py <group> <seed>  ->  one test input on stdout (stdlib only)."""
import os
import random
import sys

group, seed = sys.argv[1], int(sys.argv[2])
rng = random.Random(f"strongest-chain/{group}/{seed}")


def emit(values, parents):
    print(len(values))
    print(*values)
    print(*parents)


if group == "sample":
    emit([-3, 4, 5, -10, 7], [0, 0, 1, 1])
    sys.exit()
if group == "edge":
    cases = [
        ([-5], []),                                        # single negative node
        ([7], []),                                         # single positive node
        ([-4, -2, -9], [0, 0]),                            # all negative: best is the single largest node
        ([1, -100, 1], [0, 1]),                            # a bad middle node: do not bridge it
        ([5, 5, 5, 5, 5], [0, 1, 2, 3]),                   # a straight chain
        ([-1, 10, 10, -1], [0, 0, 1]),                     # best path bends at the root
        ([10, -1, -1, 3, 3], [0, 0, 1, 2]),                # best chain hangs off the root on one side
        ([-1000000000, 1000000000, 1000000000, 1000000000], [0, 0, 0]),  # large values: needs long long
    ]
    emit(*cases[(seed - 1) % len(cases)])
    sys.exit()
if group == "random":
    n = rng.randint(1, 14)
    lo = -9 if seed % 3 else -3  # seeds divisible by 3 skew towards non-negative scores
    hi = 9
    values = [rng.randint(lo, hi) for _ in range(n)]
    if seed % 4 == 0:
        values = [-abs(x) - 1 for x in values]  # all negative
    shape = seed % 3
    parents = []
    for i in range(1, n):
        if shape == 0:
            parents.append(i - 1)  # chain
        elif shape == 1:
            parents.append(rng.randint(max(0, i - 3), i - 1))  # deep and thin
        else:
            parents.append(rng.randint(0, i - 1))  # uniform random
    emit(values, parents)
    sys.exit()
if group == "perf":
    n = int(os.environ.get("NC_PERF_N", 0)) or 200_000
    values = [rng.randint(-10**9, 10**9) for _ in range(n)]
    if seed == 1:
        parents = [i - 1 for i in range(1, n)]  # one long chain: deep recursion and O(n^2) both hurt
    else:
        parents = [rng.randint(max(0, i - 50), i - 1) for i in range(1, n)]  # thin and deep
    emit(values, parents)
    sys.exit()
sys.exit(f"unknown group {group}")
