# Hot Tokens

A tokenizer log lists `n` token ids in the order they were produced. Print the `k` most frequent
token ids. Order them by count, highest first; when two tokens have the same count, the smaller
id comes first.

**Input.** The first line has `n` and `k`. The second line has `n` integers (token ids,
`0 <= id <= 10^9`). It is guaranteed that `1 <= k <=` the number of distinct ids.

**Output.** `k` integers on one line, separated by spaces.

**Limits.** `1 <= n <= 2 * 10^5`. Time limit 1 second.

**Example.**

```
7 2
5 5 9 9 9 5 1
```

prints `5 9`: tokens 5 and 9 both appear 3 times, so the tie goes to the
smaller id.
