"""Seeded generator: python3 gen.py <group> <seed>  ->  one test input on stdout (stdlib only)."""
import os
import random
import sys

group, seed = sys.argv[1], int(sys.argv[2])
rng = random.Random(f"peak-window/{group}/{seed}")

if group == "sample":
    print("8 3\n1 3 -1 -3 5 3 6 7")
    sys.exit()
if group == "edge":
    cases = [
        (1, 1, [-5]),
        (5, 1, [4, -2, 9, 9, 0]),            # k = 1: the array itself
        (5, 5, [-3, -1, -9, -1, -4]),         # k = n: one window, negatives, duplicate max
        (6, 2, [5, 4, 3, 2, 1, 0]),           # decreasing: the front is always the old value
        (6, 3, [2, 2, 2, 2, 2, 2]),           # all equal
    ]
    n, k, a = cases[(seed - 1) % len(cases)]
    print(n, k)
    print(*a)
    sys.exit()
if group == "random":
    n = rng.randint(1, 14)
    k = rng.randint(1, n)
    a = [rng.randint(-6, 6) for _ in range(n)]
elif group == "perf":
    n = int(os.environ.get("NC_PERF_N", 0)) or 200_000
    k = n // 2 if seed == 1 else 1000
    if seed == 1:
        a = [rng.randint(-10**9, 10**9) for _ in range(n)]
    else:
        a = sorted(rng.randint(-10**9, 10**9) for _ in range(n))[::-1]  # decreasing: deque never pops from the back
else:
    sys.exit(f"unknown group {group}")
print(n, k)
print(*a)
