"""Seeded generator: python3 gen.py <group> <seed>  ->  one test input on stdout (stdlib only)."""
import random
import sys

group, seed = sys.argv[1], int(sys.argv[2])
rng = random.Random(f"top-k-tokens/{group}/{seed}")

if group == "sample":
    print("7 2\n5 5 9 9 9 5 1")
    sys.exit()

if group == "edge":
    # all-equal counts (pure tie-break), one distinct token, max id, k = all distinct
    cases = [
        (1, 1, [0]),
        (6, 3, [4, 4, 4, 4, 4, 4]),
        (8, 4, [7, 3, 9, 1, 7, 3, 9, 1]),
        (5, 5, [10**9, 0, 10**9, 7, 0]),
    ]
    n, k, a = cases[(seed - 1) % len(cases)]
    k = min(k, len(set(a)))
    print(n, k)
    print(*a)
    sys.exit()

if group == "random":
    n = rng.randint(1, 40)
    pool = rng.randint(1, 8)
    a = [rng.randint(0, pool) for _ in range(n)]
elif group == "perf":
    n = 100_000 if seed == 1 else 200_000
    a = rng.sample(range(10**9 + 1), n) if seed == 1 else [rng.randint(0, 10**9) for _ in range(n)]
else:
    sys.exit(f"unknown group {group}")
k = rng.randint(1, len(set(a)))
print(n, k)
print(*a)
