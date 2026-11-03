"""Seeded generator: python3 gen.py <group> <seed>  ->  one test input on stdout (stdlib only)."""
import os
import random
import sys

group, seed = sys.argv[1], int(sys.argv[2])
rng = random.Random(f"fewest-tokens/{group}/{seed}")


def emit(vocab, s):
    print(len(vocab))
    print(*vocab)
    print(s)


if group == "sample":
    emit(["a", "ab", "abc", "bc"], "abcbc")
    sys.exit()
if group == "edge":
    cases = [
        (["a"], "a"),                                  # one piece, one character
        (["a", "b"], "abba"),                          # all single characters
        (["ab"], "aba"),                               # cannot be split
        (["a", "ab", "bc", "abc"], "abcabc"),          # several equal-looking splits
        (["ab", "abc", "cd", "d"], "abcd"),            # greedy takes abc then d (2); ab+cd is also 2
        (["ab", "abc", "cd"], "abcd"),                 # greedy trap: abc strands d, ab + cd works (2)
        (["aa", "a", "aaa"], "aaaaaaa"),               # many overlapping options
        (["ab", "b", "bcd", "c", "abcd"], "abcd"),     # the single long piece wins
    ]
    v, s = cases[(seed - 1) % len(cases)]
    emit(v, s)
    sys.exit()
if group == "random":
    alpha = "ab" if seed % 3 else "abc"
    m = rng.randint(1, 5)
    vocab = []
    while len(vocab) < m:
        p = "".join(rng.choice(alpha) for _ in range(rng.randint(1, 3)))
        if p not in vocab:
            vocab.append(p)
    if seed % 4 == 0:  # random text: usually impossible or awkward
        s = "".join(rng.choice(alpha) for _ in range(rng.randint(1, 12)))
    else:  # built from pieces, so an answer exists
        s = "".join(rng.choice(vocab) for _ in range(rng.randint(1, 5)))
        s = s[:12]
    emit(vocab, s)
    sys.exit()
if group == "perf":
    n = int(os.environ.get("NC_PERF_N", 0)) or 200_000
    alpha = "abcdefgh"
    if seed == 1:
        # 2000 pieces of length 1-8; text is a random concatenation, so an answer exists
        vocab = set(alpha)
        while len(vocab) < 2000:
            vocab.add("".join(rng.choice(alpha) for _ in range(rng.randint(2, 8))))
        vocab = sorted(vocab)
        parts, total = [], 0
        while total < n:
            p = rng.choice(vocab)
            parts.append(p)
            total += len(p)
        emit(vocab, "".join(parts)[:n])
    else:
        # long run of 'a' that ends in a letter nothing can match: answer -1 after full work
        vocab = ["a" * k for k in range(1, 9)]
        while len(vocab) < 2000:
            w = "".join(rng.choice("bcdefgh") for _ in range(rng.randint(1, 8)))
            if w not in vocab:
                vocab.append(w)
        emit(vocab, "a" * (n - 1) + "z")
    sys.exit()
sys.exit(f"unknown group {group}")
