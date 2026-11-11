import numpy as np


def _out_size(size, k, stride, pad):
    return (size + 2 * pad - k) // stride + 1


class Conv2D:
    def __init__(self, in_ch, out_ch, k, stride=1, pad=0, seed=0):
        rng = np.random.default_rng(seed)
        self.k, self.stride, self.pad = k, stride, pad
        self.W = rng.normal(size=(out_ch, in_ch, k, k)) / np.sqrt(in_ch * k * k)
        self.b = np.zeros(out_ch)
        self.dW = np.zeros_like(self.W)
        self.db = np.zeros_like(self.b)
        self._cols = None
        self._shape = None

    def _im2col(self, x):
        """(N, C, H, W) -> (N, C*k*k, Ho*Wo): one column per output position."""
        n, c, h, w = x.shape
        k, s, p = self.k, self.stride, self.pad
        ho, wo = _out_size(h, k, s, p), _out_size(w, k, s, p)
        xp = np.pad(x, ((0, 0), (0, 0), (p, p), (p, p)))
        cols = np.empty((n, c, k, k, ho, wo))
        for i in range(k):  # loop over kernel offsets, never over pixels
            for j in range(k):
                cols[:, :, i, j] = xp[:, :, i:i + s * ho:s, j:j + s * wo:s]
        return cols.reshape(n, c * k * k, ho * wo), ho, wo

    def forward(self, x):
        x = np.asarray(x, dtype=float)
        cols, ho, wo = self._im2col(x)
        self._cols, self._shape = cols, (x.shape, ho, wo)
        out = np.einsum("ok,nkp->nop", self.W.reshape(self.W.shape[0], -1), cols)
        return out.reshape(x.shape[0], -1, ho, wo) + self.b[None, :, None, None]

    def backward(self, dout):
        dout = np.asarray(dout, dtype=float)
        (n, c, h, w), ho, wo = self._shape
        k, s, p = self.k, self.stride, self.pad
        d = dout.reshape(n, dout.shape[1], ho * wo)
        self.dW = np.einsum("nop,nkp->ok", d, self._cols).reshape(self.W.shape)
        self.db = dout.sum(axis=(0, 2, 3))
        dcols = np.einsum("ok,nop->nkp", self.W.reshape(self.W.shape[0], -1), d)
        dcols = dcols.reshape(n, c, k, k, ho, wo)
        dxp = np.zeros((n, c, h + 2 * p, w + 2 * p))
        for i in range(k):
            for j in range(k):
                # Windows overlap, so scatter with +=: one input pixel feeds many outputs.
                dxp[:, :, i:i + s * ho:s, j:j + s * wo:s] += dcols[:, :, i, j]
        return dxp[:, :, p:p + h, p:p + w]

    def params(self):
        return [self.W, self.b]

    def grads(self):
        return [self.dW, self.db]


class MaxPool2D:
    def __init__(self, size=2, stride=None):
        self.size = size
        self.stride = size
        self._arg = None
        self._shape = None

    def forward(self, x):
        x = np.asarray(x, dtype=float)
        n, c, h, w = x.shape
        k, s = self.size, self.stride
        ho, wo = _out_size(h, k, s, 0), _out_size(w, k, s, 0)
        stack = np.stack([x[:, :, i:i + s * ho:s, j:j + s * wo:s] for i in range(k) for j in range(k)])
        self._arg = stack.argmax(axis=0)  # first maximum wins ties
        self._shape = (x.shape, ho, wo)
        return stack.max(axis=0)

    def backward(self, dout):
        dout = np.asarray(dout, dtype=float)
        (n, c, h, w), ho, wo = self._shape
        k, s = self.size, self.stride
        dx = np.zeros((n, c, h, w))
        for i in range(k):
            for j in range(k):
                mask = self._arg == i * k + j
                dx[:, :, i:i + s * ho:s, j:j + s * wo:s] += dout * mask  # overlapping windows add up
        return dx
