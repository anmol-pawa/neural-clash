# Forge 5: a multilayer perceptron

A single linear layer draws one straight boundary, so it cannot separate XOR. Put a nonlinearity and a second layer behind it and it can. This module wires Forge 3 (the linear layer) and Forge 4 (the stable loss) into a trainable `MLP`, and trains it.

## What to build

`MLP(sizes, activation="tanh", seed=0)` with `sizes = [in, h1, ..., classes]`.

- `forward(X)`: `a = act(a @ W + b)` for every hidden layer; the last layer returns **raw logits** (the loss applies softmax).
- `loss_and_backward(X, y)`: mean softmax cross-entropy against integer labels, then backprop, storing the gradients and returning the loss.
- `params()` / `grads()`: flat lists `[W1, b1, W2, b2, ...]` in the same order. `params()` returns the *live* arrays.
- `step(lr)`: SGD in place. `predict(X)`: argmax of the logits.

## Backprop through a stack

With `d` the gradient arriving at a layer's output:

1. `dW = inputᵀ d`, `db = Σ d` (sum over the batch).
2. Pass down: `d ← (d Wᵀ) ⊙ act'(pre_activation of the layer below)`.

The elementwise product is the activation's contribution: it is where a saturated tanh or a dead ReLU shuts gradients off. Cache **each layer's own** input and pre-activation during the forward pass.

## Why XOR is the right first test

Points `(0,0), (1,1)` have class 0 and `(0,1), (1,0)` class 1. No line separates them, so `MLP([2, 2])` stalls at about 50% accuracy no matter how long it trains, while a few hidden units solve it. The hidden tests check both facts. Visualising the hidden units' lines is the point of the upcoming Nest interactive.

## In place or it didn't happen

`p -= lr * g` modifies the array object that `params()` hands out. `p = p - lr * g` only rebinds a local name, and the network never changes. This is the kind of bug that makes a loss curve flat while every gradient looks right.

## Verify like a professional

Before training anything, run a finite-difference check on every parameter (the hidden tests do, for 1, 2 and 3 hidden layers with both activations). Then run the classic first experiment: **overfit a tiny batch**. If a network cannot drive the loss to ~0 on 4 points, no amount of data will fix it.

**Interview signal:** "implement a 2-layer net with backprop in numpy" is a staple ML-engineer round. Strong answers keep the shape of every gradient on the whiteboard, cache per-layer inputs, and volunteer the gradient check.
