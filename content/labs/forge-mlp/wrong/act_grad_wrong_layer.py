import numpy as np


class MLP:
    def __init__(self, sizes, activation="tanh", seed=0):
        if activation not in ("tanh", "relu"):
            raise ValueError("activation must be 'tanh' or 'relu'")
        rng = np.random.default_rng(seed)
        self.activation = activation
        self.Ws = [rng.normal(size=(a, b)) * np.sqrt(1.0 / a) for a, b in zip(sizes[:-1], sizes[1:])]
        self.bs = [np.zeros(b) for b in sizes[1:]]
        self.dWs = [np.zeros_like(W) for W in self.Ws]
        self.dbs = [np.zeros_like(b) for b in self.bs]
        self._inputs = []   # input of each linear layer
        self._pre = []      # pre-activation of each hidden layer

    def _act(self, z):
        return np.tanh(z) if self.activation == "tanh" else np.maximum(z, 0.0)

    def _act_grad(self, z):
        if self.activation == "tanh":
            return 1.0 - np.tanh(z) ** 2
        return (z > 0).astype(float)

    def forward(self, X):
        a = np.asarray(X, dtype=float)
        self._inputs, self._pre = [], []
        last = len(self.Ws) - 1
        for i, (W, b) in enumerate(zip(self.Ws, self.bs)):
            self._inputs.append(a)
            z = a @ W + b
            if i < last:
                self._pre.append(z)
                a = self._act(z)
            else:
                a = z  # raw logits: no activation on the output layer
        return a

    def loss_and_backward(self, X, y):
        logits = self.forward(X)
        n = logits.shape[0]
        shifted = logits - logits.max(axis=1, keepdims=True)
        log_p = shifted - np.log(np.exp(shifted).sum(axis=1, keepdims=True))
        loss = -log_p[np.arange(n), y].mean()
        d = np.exp(log_p)
        d[np.arange(n), y] -= 1.0
        d /= n
        for i in reversed(range(len(self.Ws))):
            self.dWs[i] = self._inputs[i].T @ d
            self.dbs[i] = d.sum(axis=0)
            if i > 0:
                d = (d @ self.Ws[i].T) * self._act_grad(self._pre[0])
        return float(loss)

    def params(self):
        out = []
        for W, b in zip(self.Ws, self.bs):
            out += [W, b]
        return out

    def grads(self):
        out = []
        for dW, db in zip(self.dWs, self.dbs):
            out += [dW, db]
        return out

    def step(self, lr):
        for p, g in zip(self.params(), self.grads()):
            p -= lr * g

    def predict(self, X):
        return self.forward(X).argmax(axis=1)
