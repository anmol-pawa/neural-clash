# Forge 6: initialisation and normalisation

Training a deep net is a fight to keep two quantities from drifting: the **size of activations** going forward and the **size of gradients** going back. Initialisation sets them right at step 0. Normalisation keeps them right while the weights move.

## Initialisation from a variance argument

For `y = Σ w·x` with independent zero-mean terms, `Var(y) = fan_in · Var(w) · E[x²]`. To keep the signal from growing or shrinking layer after layer you want `fan_in · Var(w) ≈ 1`.

- **Xavier/Glorot** balances the forward and backward pass: `Var(w) = 2 / (fan_in + fan_out)`. Derived for roughly linear units (tanh near zero).
- **He/Kaiming** accounts for ReLU zeroing half the units, which halves the second moment: `Var(w) = 2 / fan_in`.

Use the wrong one and the signal decays (or blows up) geometrically with depth. The hidden tests push data through 20 layers and measure it.

## BatchNorm

Per feature, over the batch: `xhat = (x − μ) / √(σ² + ε)`, `y = γ·xhat + β`.

- **Train vs eval is a different function.** Training uses the batch statistics (the *biased* variance); evaluation uses running averages collected during training, so a prediction does not depend on its batch mates.
- Running update: `running = (1 − momentum)·running + momentum·batch`. By convention the running *variance* uses the unbiased estimate `σ²·N/(N−1)`.
- A batch of one has no variance to speak of, so training mode rejects it.
- **Backward** is the part everyone gets wrong. `μ` and `σ²` depend on every `x` in the batch, so with `dxhat = dout·γ`:

  `dx = (1/N)·inv_std · (N·dxhat − Σ dxhat − xhat · Σ(dxhat·xhat))`

  A quick property: in training mode `Σ_batch dx = 0` (shifting the whole batch changes nothing).

## LayerNorm

Same arithmetic over the **last axis of each example**: no batch dependence, no running stats, no train/eval switch. That is why transformers use it: it works at batch size 1 and over variable-length sequences. `dgamma` and `dbeta` sum over all leading axes.

## Verify like a professional

Gradient-check `dx`, `dgamma` and `dbeta` (the hidden tests do, in both modes), and check the *behaviour*: eval must not touch the running stats, and a constant row must not produce NaN.

**Interview signal:** "why does BatchNorm behave differently at inference?" and "derive the BatchNorm backward pass" are classics. Strong answers state the train/eval difference, the role of the running statistics, and why a small batch makes the estimates noisy (the reason LayerNorm or GroupNorm are used there).
