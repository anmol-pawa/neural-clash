"""Seeded generator: python3 gen.py <group> <seed>  ->  one test input on stdout (stdlib only)."""
import os
import random
import sys

group, seed = sys.argv[1], int(sys.argv[2])
rng = random.Random(f"context-window/{group}/{seed}")

if group == "sample":
    print("7 2\n1 2 1 3 3 3 2")
    sys.exit()

if group == "edge":
    cases = [
        (1, 1, [5]),
        (6, 1, [4, 4, 4, 4, 4, 4]),
        (6, 6, [1, 2, 3, 4, 5, 6]),
        (7, 1, [1, 2, 3, 4, 5, 6, 7]),
    ]
    n, k, a = cases[(seed - 1) % len(cases)]
    print(n, k)
    print(*a)
    sys.exit()

if group == "random":
    n = rng.randint(1, 40)
    a = [rng.randint(0, rng.randint(1, 7)) for _ in range(n)]
    k = rng.randint(1, len(set(a)) + 1)
elif group == "perf":
    n = int(os.environ.get("NC_PERF_N", 0)) or 200_000
    # few distinct ids and a large k: the quadratic rescan has long spans to walk
    a = [rng.randint(0, 40) for _ in range(n)] if seed == 1 else [rng.randint(0, 10**9) % 3 for _ in range(n)]
    k = 41 if seed == 1 else 3
else:
    sys.exit(f"unknown group {group}")
print(n, k)
print(*a)
