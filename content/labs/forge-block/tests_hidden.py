import numpy as np
from nc_test import assert_close, grad_check


def _rng(s):
    return np.random.default_rng(s)


def test_hidden_gelu_matches_the_tanh_formula_and_limits():
    x = np.linspace(-6, 6, 25)
    c = np.sqrt(2 / np.pi)
    assert_close(gelu(x), 0.5 * x * (1 + np.tanh(c * (x + 0.044715 * x**3))))
    assert abs(gelu(np.array([0.0]))[0]) == 0.0
    assert_close(gelu(np.array([10.0, -10.0])), np.array([10.0, 0.0]), rtol=0, atol=1e-6)
    assert gelu(np.array([-0.5]))[0] < 0  # unlike ReLU it dips below zero for small negatives


def test_hidden_gelu_backward_finite_differences():
    x = _rng(0).normal(scale=2.0, size=(3, 5))
    up = _rng(1).normal(size=x.shape)
    dx = gelu_backward(x, up)
    grad_check(lambda z: float((gelu(z) * up).sum()), x, dx)
    assert_close(gelu_backward(np.array([0.0]), np.array([1.0])), np.array([0.5]))  # gelu'(0) = 1/2


def test_hidden_layernorm_matches_definition_and_params():
    x = _rng(2).normal(2.0, 3.0, size=(2, 3, 6))
    ln = LayerNorm(6)
    ln.gamma = _rng(3).normal(size=6)
    ln.beta = _rng(4).normal(size=6)
    y = ln.forward(x)
    mu = x.mean(axis=-1, keepdims=True)
    var = ((x - mu) ** 2).mean(axis=-1, keepdims=True)  # biased
    assert_close(y, ln.gamma * (x - mu) / np.sqrt(var + 1e-5) + ln.beta)
    assert ln.params()[0] is ln.gamma and len(ln.grads()) == 2


def test_hidden_layernorm_constant_token_is_finite_thanks_to_eps():
    x = np.ones((1, 2, 4)) * 7.0
    y = LayerNorm(4).forward(x)
    assert np.all(np.isfinite(y))
    assert_close(y, np.zeros_like(y))


def test_hidden_layernorm_ignores_other_tokens_and_batch():
    x = _rng(5).normal(size=(3, 4, 6))
    ln = LayerNorm(6)
    full = ln.forward(x)
    solo = LayerNorm(6).forward(x[1:2, 2:3])
    assert_close(full[1, 2], solo[0, 0])


def test_hidden_layernorm_backward_finite_differences():
    r = _rng(6)
    x = r.normal(size=(2, 3, 5))
    up = r.normal(size=x.shape)
    ln = LayerNorm(5)
    ln.gamma = r.normal(size=5) + 1.0
    ln.beta = r.normal(size=5)
    ln.forward(x)
    dx = ln.backward(up)
    dg, db = ln.dgamma.copy(), ln.dbeta.copy()

    def L(x_=None, g=None, b=None):
        m = LayerNorm(5)
        m.gamma = ln.gamma if g is None else g
        m.beta = ln.beta if b is None else b
        return float((m.forward(x if x_ is None else x_) * up).sum())

    grad_check(lambda z: L(x_=z), x, dx)
    grad_check(lambda z: L(g=z), ln.gamma, dg)
    grad_check(lambda z: L(b=z), ln.beta, db)
    # Shifting every feature of a token by a constant changes nothing, so dx sums to zero over features.
    assert_close(dx.sum(axis=-1), np.zeros((2, 3)), atol=1e-9)


def test_hidden_layernorm_backward_sets_not_accumulates():
    x = _rng(7).normal(size=(2, 3, 4))
    up = _rng(8).normal(size=x.shape)
    ln = LayerNorm(4)
    ln.forward(x)
    ln.backward(up)
    first = ln.dgamma.copy()
    ln.forward(x)
    ln.backward(up)
    assert_close(ln.dgamma, first)


def test_hidden_feedforward_forward_matches_definition():
    ff = FeedForward(6, 24, seed=3)
    assert ff.W1.shape == (6, 24) and ff.W2.shape == (24, 6)
    assert np.all(ff.b1 == 0) and np.all(ff.b2 == 0)
    r = _rng(9)
    ff.b1 = r.normal(size=24)
    ff.b2 = r.normal(size=6)
    x = r.normal(size=(2, 4, 6))
    assert_close(ff.forward(x), gelu(x @ ff.W1 + ff.b1) @ ff.W2 + ff.b2)


def test_hidden_feedforward_init_is_seeded_and_scaled():
    a, b = FeedForward(6, 24, seed=3), FeedForward(6, 24, seed=3)
    assert_close(a.W1, b.W1)
    assert_close(a.W2, b.W2)
    big = FeedForward(64, 256, seed=0)
    assert abs(big.W1.std() - 1 / np.sqrt(64)) < 0.01
    assert abs(big.W2.std() - 1 / np.sqrt(256)) < 0.005


def test_hidden_feedforward_acts_on_each_token_independently():
    ff = FeedForward(5, 12, seed=1)
    x = _rng(10).normal(size=(1, 4, 5))
    full = ff.forward(x)
    for t in range(4):
        assert_close(ff.forward(x[:, t:t + 1]), full[:, t:t + 1])


def test_hidden_feedforward_backward_finite_differences():
    r = _rng(11)
    ff = FeedForward(4, 9, seed=2)
    ff.b1 = r.normal(size=9)
    ff.b2 = r.normal(size=4)
    x = r.normal(size=(2, 3, 4))
    up = r.normal(size=x.shape)
    ff.forward(x)
    dx = ff.backward(up)
    grads = [g.copy() for g in ff.grads()]
    assert [g.shape for g in grads] == [p.shape for p in ff.params()]

    def L(x_=None, which=None, val=None):
        m = FeedForward(4, 9, seed=2)
        m.b1, m.b2 = ff.b1.copy(), ff.b2.copy()
        if which is not None:
            setattr(m, which, val)
        return float((m.forward(x if x_ is None else x_) * up).sum())

    grad_check(lambda z: L(x_=z), x, dx)
    for name, g in zip(["W1", "b1", "W2", "b2"], grads):
        grad_check(lambda z, n=name: L(which=n, val=z), getattr(ff, name), g)


def test_hidden_block_matches_pre_ln_formula():
    blk = TransformerBlock(8, 2, 16, seed=4)
    x = _rng(12).normal(size=(2, 5, 8))
    y = blk.forward(x)
    ln1, ln2 = LayerNorm(8), LayerNorm(8)
    attn = MultiHeadAttention(8, 2, seed=4)
    ff = FeedForward(8, 16, seed=5)
    x1 = x + attn.forward(ln1.forward(x))
    assert_close(y, x1 + ff.forward(ln2.forward(x1)))


def test_hidden_block_with_zeroed_sublayers_is_the_identity():
    # The residual stream passes through untouched: with the output projections zeroed, out == x exactly.
    # (A post-LN block would still normalise x here.)
    blk = TransformerBlock(8, 2, 16, seed=0)
    blk.attn.Wo[:] = 0.0
    blk.ff.W2[:] = 0.0
    blk.ff.b2[:] = 0.0
    x = _rng(13).normal(2.0, 4.0, size=(2, 5, 8))
    assert_close(blk.forward(x), x)
    up = _rng(14).normal(size=x.shape)
    assert_close(blk.backward(up), up)  # the gradient highway: dout reaches the input unchanged


def test_hidden_block_does_not_mutate_input_and_is_causal():
    blk = TransformerBlock(8, 2, 16, seed=0)
    x = _rng(15).normal(size=(1, 6, 8))
    before = x.copy()
    y = blk.forward(x)
    assert np.array_equal(x, before)
    assert np.all(np.triu(blk.attn_weights[0, 0], 1) == 0)
    x2 = x.copy()
    x2[:, 4:] = _rng(16).normal(size=(1, 2, 8))  # change only the future
    y2 = TransformerBlock(8, 2, 16, seed=0).forward(x2)
    assert_close(y2[:, :4], y[:, :4])
    assert not np.allclose(y2[:, 4:], y[:, 4:])
    blk.forward(x, causal=False)
    assert np.all(blk.attn_weights > 0)


def test_hidden_block_layernorms_are_separate_objects():
    blk = TransformerBlock(6, 2, 12, seed=0)
    assert blk.ln1 is not blk.ln2
    assert blk.ln1.gamma is not blk.ln2.gamma


def test_hidden_block_backward_finite_differences_input_and_every_param():
    r = _rng(17)
    d, h, f = 6, 2, 10
    blk = TransformerBlock(d, h, f, seed=3)
    for p in blk.params():  # move away from the trivial init so every path matters
        p += 0.3 * r.normal(size=p.shape)
    x = r.normal(size=(2, 4, d))
    up = r.normal(size=x.shape)
    blk.forward(x)
    dx = blk.backward(up)
    grads = [g.copy() for g in blk.grads()]
    saved = [p.copy() for p in blk.params()]
    assert len(grads) == len(saved) == 12

    def L(x_=None, idx=None, val=None):
        m = TransformerBlock(d, h, f, seed=3)
        for p, s in zip(m.params(), saved):
            p[:] = s
        if idx is not None:
            m.params()[idx][:] = val
        return float((m.forward(x if x_ is None else x_) * up).sum())

    grad_check(lambda z: L(x_=z), x, dx, tol=1e-5)
    for i, (s, g) in enumerate(zip(saved, grads)):
        grad_check(lambda z, i=i: L(idx=i, val=z), s, g, tol=1e-5)


def test_hidden_block_backward_sets_not_accumulates():
    blk = TransformerBlock(6, 2, 10, seed=1)
    x = _rng(18).normal(size=(1, 3, 6))
    up = _rng(19).normal(size=x.shape)
    blk.forward(x)
    blk.backward(up)
    first = [g.copy() for g in blk.grads()]
    blk.forward(x)
    blk.backward(up)
    for a, b in zip(first, blk.grads()):
        assert_close(a, b)


def test_hidden_param_count_matches_the_real_block_and_formula():
    for d, h, f in [(8, 2, 32), (12, 3, 48), (16, 4, 24)]:
        blk = TransformerBlock(d, h, f)
        assert block_param_count(d, f) == sum(p.size for p in blk.params())
    # With d_ff = 4 d the weights dominate: ~12 d^2.
    d = 1024
    assert abs(block_param_count(d, 4 * d) / (12 * d * d) - 1) < 0.002
    assert block_param_count(8, 64) != block_param_count(8, 32)  # d_ff must be honoured, not assumed 4d


def test_hidden_flops_formula_and_scaling():
    assert block_flops(1, 1, 1) == 8 + 4 + 4
    assert block_flops(4, 8, 32) == 6656
    # Attention matmuls are quadratic in T; the rest is linear.
    d, f = 16, 64
    lin = lambda T: 8 * T * d * d + 4 * T * d * f
    for T in (8, 64, 512):
        assert block_flops(T, d, f) - lin(T) == 4 * T * T * d
    # Doubling the context more than doubles the cost once T is large relative to d.
    assert block_flops(4096, 64, 256) > 2.5 * block_flops(2048, 64, 256)
    assert block_flops(2048, 64, 256) * 2 > block_flops(1024, 64, 256) * 3.9
