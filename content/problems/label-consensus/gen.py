"""Seeded generator: python3 gen.py <group> <seed>  ->  one test input on stdout (stdlib only)."""
import os
import random
import sys

group, seed = sys.argv[1], int(sys.argv[2])
rng = random.Random(f"label-consensus/{group}/{seed}")

if group == "sample":
    print("7\n3 3 4 3 1 3 4")
    sys.exit()
if group == "edge":
    cases = [
        [5],                                    # one annotator
        [1, 1, 2, 2],                           # tie: no majority
        [7, 7, 7, 7, 7],                        # unanimous
        [0, 1, 2, 3, 4, 5],                     # all distinct
        [1, 2, 1, 3, 1, 4, 1],                  # majority by exactly one vote (4 of 7)
        [9, 9, 1, 1, 1, 2, 2],                  # the last label is not the winner
    ]
    a = cases[(seed - 1) % len(cases)]
    print(len(a))
    print(*a)
    sys.exit()
if group == "random":
    n = rng.randint(1, 15)
    labels = rng.randint(1, 4)
    a = [rng.randint(0, labels - 1) for _ in range(n)]
    if seed % 2 == 0:  # force a majority half of the time
        w = rng.randint(0, 9)
        for i in rng.sample(range(n), n // 2 + 1):
            a[i] = w
elif group == "perf":
    n = int(os.environ.get("NC_PERF_N", 0)) or 200_000
    if seed == 1:
        a = [rng.randint(0, 10**9) for _ in range(n)]
        for i in rng.sample(range(n), n // 2 + 1):
            a[i] = 424242  # exact-majority winner hidden among noise
    else:
        a = [rng.choice((1, 2, 3)) for _ in range(n)]  # a plurality exists but rarely a majority
else:
    sys.exit(f"unknown group {group}")
print(n)
print(*a)
