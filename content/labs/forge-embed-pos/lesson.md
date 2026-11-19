# Forge 11: `Embedding`, `sinusoidal_pe` and `rope`

A transformer never sees words. It sees **integer ids**, and it has no built-in idea of order. Two small pieces fix both problems, and you will build both.

## Embedding: a lookup that learns

`Embedding(vocab, dim)` owns a table `W` of shape `(vocab, dim)`. Forward is just `W[ids]`: row `v` is the vector for token `v`. It is the same as multiplying a one-hot vector by `W`, minus the wasted zeros.

Backward is where bugs live. The ids are integers, so there is nothing to differentiate with respect to them (return `None`). The table's gradient is a **scatter**: every position that used token `v` sends its upstream gradient to row `v`, and a token used three times gets the **sum** of three gradients. Rows for tokens that never appeared get exactly zero.

Two traps:

- `dW[ids] = dout` overwrites, so repeats keep one gradient.
- `dW[ids] += dout` looks right but NumPy evaluates it with a buffered read-modify-write, so repeats still count once. Use `np.add.at(dW, ids, dout)`, the unbuffered scatter-add.

Initialisation matters too: `Normal(0, 1) / sqrt(dim)` keeps each vector near unit length so the embedding does not drown the position signal added next.

## Sinusoidal positions: order from fixed waves

Attention treats its inputs as a set. To tell "dog bites man" from "man bites dog" you add information about **where** each token is. The original transformer used a fixed table:

`PE[pos, 2i] = sin(pos / base^(2i/d))`, `PE[pos, 2i+1] = cos(pos / base^(2i/d))`.

Each pair of columns is a wave with its own wavelength, from `2π` up to about `base · 2π`: fast waves tell neighbours apart, slow waves tell far positions apart, like the digits of a clock. Because `sin(p + k)` and `cos(p + k)` are a **fixed rotation** of `sin(p)` and `cos(p)`, a layer can in principle learn "attend to the token `k` steps back" with a linear map. The table has no parameters, and it is **added** to the embeddings.

## RoPE: rotate instead of add

Rotary embeddings (used by most recent open decoder models, as of November 2026) put position **inside the attention score**. Take each neighbouring pair `(x[2i], x[2i+1])` of a query or key and rotate it by the angle `t · base^(-2i/D)`, where `t` is the token's position:

`a' = a cos θ − b sin θ`, `b' = a sin θ + b cos θ`.

Rotations preserve length, so norms are untouched. The magic is in the dot product: rotating the query by `θ_m` and the key by `θ_n` gives a score that depends only on `m − n`. The model gets **relative** position for free, with no parameters and no extra input. You will test exactly that property.

Because a rotation matrix is orthogonal, its gradient is its transpose, which is the rotation by the **negative** angle. So `backward = rope(dout, inverse=True)`: the same code with `sin` negated.

Layout note: this lab pairs neighbours `(2i, 2i+1)`. Some libraries pair `(i, i + D/2)` ("rotate-half"). Both are valid RoPE if used consistently, but they are different layouts, so weights are not interchangeable. The hidden tests check the layout stated here.

## Honest limits

Fixed sinusoids and RoPE are chosen, not proven best. Extrapolating past the lengths seen in training is still a known problem, which is why long-context models rescale RoPE's base or interpolate positions and then fine-tune. Learned absolute position tables are also still used. Treat the choice as an engineering trade-off, not a law.

**Interview signal:** "why does attention need positional information", "sinusoidal vs learned vs RoPE" and "what is the gradient of an embedding lookup" are standard. A strong answer says: permutation invariance, relative-vs-absolute, rotation preserves norm, and scatter-add for repeated ids.
