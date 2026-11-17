# Attention Block

A model uses an `R x C` **attention mask**: each cell is `1` if that query may attend to that key, and `0` if it is
blocked. A kernel can process a **block** efficiently only if it is a rectangle of consecutive rows and consecutive
columns in which **every** cell is `1`.

Find the **largest area** (rows times columns) of such a rectangle. If every cell is blocked, the answer is `0`.

**Input.** The first line has `R C`. The next `R` lines each hold a string of `C` characters, `0` or `1`.

**Output.** One integer: the largest area.

**Limits.** `1 <= R, C <= 1500`. Time limit 1 second.

**Example.**

```
3 5
10110
10111
11111
```

prints `6`: the rectangle covering rows 2 and 3 and columns 3 to 5 holds 2 x 3 = 6 allowed cells. The best square has
side 2 (area 4), so the biggest rectangle is not always a square.
