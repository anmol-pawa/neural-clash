"""Seeded generator: python3 gen.py <group> <seed>  ->  one test input on stdout (stdlib only)."""
import os
import random
import sys

group, seed = sys.argv[1], int(sys.argv[2])
rng = random.Random(f"pipeline-order/{group}/{seed}")


def emit(n, edges):
    print(n, len(edges))
    for a, b in edges:
        print(a, b)


def dag(n, m):
    """Random DAG: hidden topological order is a shuffle, edges go forward in it."""
    rank = list(range(1, n + 1))
    rng.shuffle(rank)
    edges = []
    for _ in range(m):
        i, j = sorted(rng.sample(range(n), 2)) if n > 1 else (0, 0)
        if i != j:
            edges.append((rank[i], rank[j]))
    return edges


if group == "sample":
    emit(4, [(3, 1), (4, 1), (2, 4)])
elif group == "edge":
    cases = [
        (1, []),                                   # single stage
        (3, [(1, 2), (2, 3), (3, 1)]),             # pure cycle
        (3, [(2, 2)]),                             # self-loop
        (4, [(4, 3), (3, 2), (2, 1)]),             # reversed chain: forced order
        (5, [(1, 2), (1, 2), (1, 2), (4, 5)]),     # duplicate pairs
    ]
    n, e = cases[(seed - 1) % len(cases)]
    emit(n, e)
elif group == "random":
    n = rng.randint(1, 7)
    edges = dag(n, rng.randint(0, 2 * n))
    if seed % 3 == 0 and n >= 2:  # sometimes close a cycle
        a, b = rng.sample(range(1, n + 1), 2)
        edges += [(a, b), (b, a)]
    rng.shuffle(edges)
    emit(n, edges)
elif group == "perf":
    n = int(os.environ.get("NC_PERF_N", 0)) or 200_000
    if seed == 1:
        emit(n, dag(n, 2 * n))
    else:  # sparse DAG: many stages ready at once, so the heap does real work
        emit(n, dag(n, n // 2))
else:
    sys.exit(f"unknown group {group}")
