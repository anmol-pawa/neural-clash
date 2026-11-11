# Forge 9: `Conv2D` and `MaxPool2D`

A fully connected layer on a 16x16 image has 256 inputs per neuron and no idea that a pixel's neighbours matter. A **convolution** reuses one small kernel at every position: far fewer parameters, and a shifted shape produces a shifted response. You will write the layer, its backward pass and a max-pool, the way a framework does it, and prove them with finite differences.

## What to build

`Conv2D(in_ch, out_ch, k, stride=1, pad=0, seed=0)` on images shaped `(N, C, H, W)`.

- `W` has shape `(out_ch, in_ch, k, k)` and is drawn `Normal(0, 1/(in_ch*k*k))` from `np.random.default_rng(seed)`; `b` is zeros. `dW` and `db` mirror them.
- `forward(x)` zero-pads every side by `pad`, slides each kernel with `stride`, and returns `(N, out_ch, Ho, Wo)` where `Ho = (H + 2*pad - k) // stride + 1`.
- `backward(dout)` **sets** `dW`, `db` and returns `dx` in the input's shape.

`MaxPool2D(size=2, stride=None)` keeps the maximum of each window; `stride` defaults to `size`. Windows that do not fit entirely are dropped.

## Cross-correlation, not convolution

Deep-learning "convolution" does **not** flip the kernel: `out[i, j] = sum over (u, v) of x[i+u, j+v] * K[u, v]`. Flipping would change nothing about what a network can learn (the kernel is learned either way) but it would break numerical agreement with every framework.

## im2col: turn it back into a matmul

Looping over output pixels in Python is hopeless. Instead, for each of the `k*k` kernel offsets take one strided slice of the padded image. Stacked, they give a matrix with one column per output position and `C*k*k` rows. Now:

- forward is `W.reshape(out_ch, -1) @ cols`: the same matmul as `Linear`;
- `dW = dout @ colsᵀ`, summed over the batch (the Forge 3 shape argument, unchanged);
- `db` is `dout` summed over the batch **and both spatial axes**: the bias was broadcast to every position;
- `dcols = Wᵀ @ dout`, and then you must **fold the columns back** into an image. Neighbouring windows read the same pixel, so the fold **adds** (`+=`). Assigning instead of adding is the classic bug. The centre pixel of a 3x3 kernel on a 5x5 image receives gradient from 9 windows; a corner from 1.

Finally crop the padding off `dx`: padded zeros are not inputs.

## Max-pool backward

Forward remembers which offset in each window won (`argmax`). Backward gives the output's whole gradient to that one input and nothing to the others, because a small change to a non-maximal input does not move the output. On exact ties send it to the first maximum only, so total gradient is conserved. With `stride < size` windows overlap and an input can win several of them: gradients add again.

## Cost, honestly

A conv layer has `out_ch * in_ch * k * k` weights regardless of image size, but `Ho * Wo` times that many multiply-adds. Sharing weights buys parameter efficiency, not compute efficiency: the shape solvers in the Conv Caverns count both.

**Interview signal:** "implement conv2d backward" and "why does max-pool route the gradient to one element" are standard ML-engineer questions. A strong answer states the output-size formula, explains im2col as a reduction to matmul, and notes the `+=` in the fold.
