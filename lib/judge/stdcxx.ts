// libc++ has no <bits/stdc++.h>; interview code often includes it, so we provide a shim
// made of the standard headers (C++17/20). Exceptions are not available in this toolchain
// (see docs/adr/0002-cpp-judge.md), so <stdexcept>-style throwing code aborts at run time.
const HEADERS = [
  "algorithm", "array", "bitset", "cassert", "chrono", "climits", "cmath", "cstdint", "cstdio",
  "cstdlib", "cstring", "deque", "functional", "iomanip", "iostream", "iterator", "limits", "list",
  "map", "memory", "numeric", "optional", "queue", "random", "set", "sstream", "stack", "string",
  "string_view", "tuple", "unordered_map", "unordered_set", "utility", "variant", "vector",
];

export const BITS_STDCXX_H = `#pragma once\n${HEADERS.map((h) => `#include <${h}>`).join("\n")}\n`;
