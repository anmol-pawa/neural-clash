"""Seeded generator: python3 gen.py <group> <seed>  ->  one test input on stdout (stdlib only)."""
import os
import random
import sys

group, seed = sys.argv[1], int(sys.argv[2])
rng = random.Random(f"worst-hop/{group}/{seed}")


def emit(parents, weights):
    n = len(parents) + 1
    out = [str(n)]
    for p, w in zip(parents, weights):
        out.append(f"{p} {w}")
    print("\n".join(out))


if group == "sample":
    # 0 is the gateway; 1,2 under 0; 3,4 under 1. Best: 4-1-0-2 = 6+3+5 = 14
    emit([0, 0, 1, 1], [3, 5, 4, 6])
    sys.exit()
if group == "edge":
    cases = [
        ([0], [7]),                                    # two nodes
        ([0, 1, 2, 3], [1, 1, 1, 1]),                  # a chain
        ([0, 0, 0, 0], [1, 2, 3, 4]),                  # a star: best two edges 3 + 4
        ([0, 1, 1, 0], [1, 10, 10, 1]),                # best path avoids the root
        ([0, 0, 1, 2], [1, 1, 100, 100]),              # two heavy branches through the root
        ([0, 1, 2, 3, 4, 5], [10**9] * 6),             # sum exceeds 32-bit
        ([0, 1, 1, 3, 3], [5, 1, 1, 9, 9]),            # best path is inside a subtree
        ([0, 0, 1, 1, 2, 2], [4, 4, 4, 4, 4, 4]),      # balanced, many ties
    ]
    p, w = cases[(seed - 1) % len(cases)]
    emit(p, w)
    sys.exit()
if group == "random":
    n = rng.randint(2, 12)
    heavy = seed % 4 == 0
    parents = [rng.randint(max(0, i - (3 if seed % 2 else i)), i - 1) for i in range(1, n)]
    weights = [rng.randint(1, 20) if not heavy else rng.randint(1, 10**9) for _ in range(n - 1)]
    emit(parents, weights)
    sys.exit()
if group == "perf":
    n = int(os.environ.get("NC_PERF_N", 0)) or 200_000
    if seed == 1:
        # one long heavy chain: forces 64-bit sums and deep structure
        parents = [i - 1 for i in range(1, n)]
        weights = [rng.randint(10**8, 10**9) for _ in range(n - 1)]
    else:
        # random tree with a long tail; the best path sits away from the root
        parents = [rng.randint(0, i - 1) if i < n // 2 else i - 1 for i in range(1, n)]
        weights = [rng.randint(1, 10**9) for _ in range(n - 1)]
    emit(parents, weights)
    sys.exit()
sys.exit(f"unknown group {group}")
