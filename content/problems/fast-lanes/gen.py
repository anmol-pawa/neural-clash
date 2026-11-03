"""Seeded generator: python3 gen.py <group> <seed>  ->  one test input on stdout (stdlib only)."""
import os
import random
import sys

group, seed = sys.argv[1], int(sys.argv[2])
rng = random.Random(f"fast-lanes/{group}/{seed}")


def emit(n, k, edges):
    print(n, len(edges), k)
    for u, v, w in edges:
        print(u, v, w)


if group == "sample":
    emit(4, 1, [(1, 2, 10), (2, 4, 10), (1, 3, 3), (3, 4, 50)])
    sys.exit()

if group == "edge":
    cases = [
        (2, 0, [(1, 2, 5)]),                                   # k = 0: plain shortest path
        (3, 2, [(1, 2, 7), (2, 3, 9)]),                        # more lanes than links on the route
        (3, 1, [(2, 3, 1)]),                                   # unreachable
        (4, 1, [(1, 2, 1), (2, 3, 1), (3, 4, 100), (1, 4, 60)]),  # heaviest edge of the cheapest path is not the best waiver
        (6, 1, [(i, i + 1, 10**9) for i in range(1, 6)]),      # answer 4 * 10^9 does not fit in 32 bits
    ]
    n, k, e = cases[(seed - 1) % len(cases)]
    emit(n, k, e)
    sys.exit()

if group == "random":
    n = rng.randint(2, 8)
    m = rng.randint(1, 16)
    k = rng.randint(0, 3)
    w_max = rng.choice([3, 10, 50])
    edges = [(rng.randint(1, n), rng.randint(1, n), rng.randint(0, w_max)) for _ in range(m)]
    emit(n, k, edges)
elif group == "perf":
    n = int(os.environ.get("NC_PERF_N", 0)) or 20_000
    k = 10
    edges = [(i, i + 1, rng.randint(10**8, 10**9)) for i in range(1, n)]  # a long chain: sums exceed 2^31
    extra = 3 * n - len(edges) if seed == 1 else 2 * n
    for _ in range(extra):
        u, v = rng.randint(1, n), rng.randint(1, n)
        edges.append((u, v, rng.randint(0, 10**9)))
    rng.shuffle(edges)
    emit(n, k, edges[: 6 * 10**4])
else:
    sys.exit(f"unknown group {group}")
