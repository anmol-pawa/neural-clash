# Fewest Tokens: editorial

**Pattern.** 1D dynamic programming over prefixes (word-break family, minimising a count).

**Brute force.** Try every piece at every position recursively. Without memoisation the same suffix is solved
many times: exponential in `|s|`. It is the specification for the small tests only.

**Greedy trap.** Always taking the longest matching piece is tempting (real BPE-style tokenizers do apply
merges greedily) but it is *not* optimal for this question. With pieces `ab`, `abc`, `cd` and the text `abcd`, the longest
first piece `abc` leaves a `d` that nothing matches, while `ab` + `cd` spells the whole text.

**State.** `best[i]` = the fewest pieces that spell the first `i` characters, `INF` if impossible; `best[0] = 0`.

**Transition.** `best[i] = min(best[i - len] + 1)` over every length `len` (1 to the longest piece) where
`s[i - len, i)` is a piece **and** `best[i - len]` is reachable. Only lengths up to the longest piece need checking.

**Complexity.** `L` is the longest piece (at most 8): O(n * L) substring lookups in a hash set, about O(n * L^2)
character work; O(n) space. Iterating over all `m` pieces per position instead costs O(n * m * L), roughly 3 * 10^9
at the limits, too slow.

**Pitfalls.** Treating unreachable prefixes as `0` (they then look free: print `-1` by checking `INF`, never by a
sentinel that arithmetic can reach). Forgetting `len <= i`. Returning the number of characters instead of pieces.
Using plain recursion for `n = 2 * 10^5`: depth and time both blow up.

**Follow-ups.** Count the number of segmentations modulo a prime. Recover one optimal split (store the previous
index). Use a trie so a lookup never builds substrings. Weighted pieces (cost per token, as in a pricing model) turn
the `+ 1` into `+ cost`. Compare with how production tokenizers actually work: they apply learned merge rules
rather than solving this optimisation, so the minimum-token split is an upper bound on efficiency, not what a
tokenizer returns.
