"""numpy reference for lib/train: reads a JSON job on stdin, prints weights + history as JSON."""
import json, sys
import numpy as np

job = json.loads(sys.stdin.read())
X = np.array(job["X"]); y = np.array(job["y"], dtype=float)
deg = job["degree"]; kind = job["model"]; lr = job["lr"]; l2 = job["l2"]; epochs = job["epochs"]

def poly(X, d):
    cols = []
    for k in range(1, d + 1):
        for i in range(k, -1, -1):
            cols.append(X[:, 0] ** i * X[:, 1] ** (k - i))
    return np.stack(cols, axis=1)

F = poly(X, deg)
A = np.hstack([np.ones((len(F), 1)), F])

def sigmoid(z):
    return np.where(z >= 0, 1 / (1 + np.exp(-np.abs(z))), np.exp(-np.abs(z)) / (1 + np.exp(-np.abs(z))))

def loss_grad(w):
    z = A @ w
    n = len(y)
    if kind == "linear":
        loss = np.mean((z - y) ** 2); grad = (2 / n) * (A.T @ (z - y))
    else:
        loss = np.mean(np.maximum(z, 0) - z * y + np.log1p(np.exp(-np.abs(z)))); grad = (A.T @ (sigmoid(z) - y)) / n
    pen = np.r_[0.0, w[1:]]
    return loss + l2 * np.sum(pen ** 2), grad + 2 * l2 * pen

w = np.zeros(A.shape[1]); hist = []
for _ in range(epochs):
    l, g = loss_grad(w); hist.append(float(l)); w = w - lr * g
print(json.dumps({"w": w.tolist(), "history": hist}))
