"""Seeded generator: python3 gen.py <group> <seed>  ->  one test input on stdout (stdlib only)."""
import math
import os
import random
import sys

group, seed = sys.argv[1], int(sys.argv[2])
rng = random.Random(f"attention-block/{group}/{seed}")


def emit(rows):
    print(len(rows), len(rows[0]))
    print("\n".join(rows))


if group == "sample":
    emit(["10110", "10111", "11111"])
    sys.exit()
if group == "edge":
    cases = [
        ["0"],                                  # a single blocked cell
        ["1"],                                  # a single allowed cell
        ["0000", "0000"],                       # all blocked
        ["1111", "1111", "1111"],               # all allowed
        ["1110111", "1110111", "0000000", "1111111"],   # rectangle taller than a square
        ["1" * 12, "0" * 12, "1" * 12],         # only wide single rows
    ]
    emit(cases[(seed - 1) % len(cases)])
    sys.exit()
if group == "random":
    r, c = rng.randint(1, 7), rng.randint(1, 8)
    p = [0.3, 0.6, 0.8, 0.9][seed % 4]
    emit(["".join("1" if rng.random() < p else "0" for _ in range(c)) for _ in range(r)])
    sys.exit()
if group == "perf":
    n = int(os.environ.get("NC_PERF_N", 0)) or 2_250_000
    side = max(2, math.isqrt(n))
    # Mostly allowed so that naive scans run long; seed 1 has a few rare blocks, seed 2 is banded.
    if seed == 1:
        rows = ["".join("0" if rng.random() < 0.0005 else "1" for _ in range(side)) for _ in range(side)]
    else:
        rows = []
        for i in range(side):
            rows.append("".join("0" if (j % 97 == 0 or rng.random() < 0.001) else "1" for j in range(side)))
    emit(rows)
    sys.exit()
sys.exit(f"unknown group {group}")
