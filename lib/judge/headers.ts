// libc++ has no <bits/stdc++.h> (it is a libstdc++ extension), but interview code and LeetCode-style
// solutions often start with it. The judge supplies this shim in a virtual include directory.
export const STDCXX_SHIM = [
  "algorithm", "array", "bitset", "cassert", "climits", "cmath", "cstdint", "cstdio", "cstdlib", "cstring",
  "deque", "functional", "iomanip", "iostream", "iterator", "limits", "list", "map", "memory", "numeric",
  "optional", "queue", "random", "set", "sstream", "stack", "string", "string_view", "tuple",
  "unordered_map", "unordered_set", "utility", "variant", "vector",
]
  .map((h) => `#include <${h}>`)
  .join("\n");

export const JUDGE_STD = "c++20";
/** 256 MiB linear memory cap and 8 MiB stack: a runaway allocation or recursion traps instead of hanging the tab. */
export const CLANG_FLAGS = [
  "-std=" + JUDGE_STD,
  "-O2",
  "-fno-exceptions", // libc++ for wasm32-wasip1 ships without the exception runtime
  "-Wall",
  "-Wextra",
  "-Iinc",
  "-Wl,--max-memory=268435456",
  "-Wl,-z,stack-size=8388608",
];
