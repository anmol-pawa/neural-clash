"""Seeded generator: python3 gen.py <group> <seed>  ->  one test input on stdout (stdlib only)."""
import os
import random
import sys

group, seed = sys.argv[1], int(sys.argv[2])
rng = random.Random(f"batch-packer/{group}/{seed}")

if group == "sample":
    print("5 2\n7 2 5 10 8")
    sys.exit()

if group == "edge":
    cases = [
        (1, 1, [9]),
        (4, 4, [3, 1, 4, 1]),   # one sequence per batch: answer is the max
        (4, 1, [3, 1, 4, 1]),   # one batch: answer is the sum
        (5, 3, [1, 1, 1, 1, 100]),  # one huge sequence dominates
    ]
    n, b, a = cases[(seed - 1) % len(cases)]
    print(n, b)
    print(*a)
    sys.exit()

if group == "random":
    n = rng.randint(1, 12)
    a = [rng.randint(1, rng.choice([5, 20, 100])) for _ in range(n)]
    b = rng.randint(1, n)
elif group == "perf":
    n = int(os.environ.get("NC_PERF_N", 0)) or 200_000
    a = [rng.randint(1, 10**9) for _ in range(n)]
    b = n // 2 if seed == 1 else 7
else:
    sys.exit(f"unknown group {group}")
print(n, b)
print(*a)
