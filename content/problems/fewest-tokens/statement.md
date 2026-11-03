# Fewest Tokens

A tokenizer has a fixed vocabulary of `m` distinct pieces. Given a text `s`, split it into **consecutive vocabulary
pieces** (every character belongs to exactly one piece, pieces may be reused) using as **few pieces** as possible.

**Input.** The first line has `m`. The second line has the `m` pieces separated by spaces. The third line is the
text `s`. Pieces and text use lowercase letters `a`-`z` only.

**Output.** The minimum number of pieces, or `-1` if `s` cannot be split at all.

**Limits.** `1 <= m <= 2000`, each piece has `1` to `8` characters, `1 <= |s| <= 2 * 10^5`. Time limit 1 second.

**Example.**

```
4
a ab abc bc
abcbc
```

prints `2`: `abc` + `bc`. (Splitting greedily with the longest piece first also gives `abc` + `bc` here, but not always.)
