import numpy as np
from nc_test import assert_close, grad_check


def test_embedding_repeated_ids_accumulate_gradient():
    emb = Embedding(5, 3, seed=2)
    ids = np.array([[1, 1, 4], [1, 0, 4]])
    emb.forward(ids)
    dout = np.arange(18, dtype=float).reshape(2, 3, 3)
    emb.backward(dout)
    want = np.zeros((5, 3))
    for n in range(2):
        for t in range(3):
            want[ids[n, t]] += dout[n, t]
    assert_close(emb.dW, want)
    assert np.all(emb.dW[2] == 0) and np.all(emb.dW[3] == 0)  # unused rows get exactly zero


def test_hidden_embedding_finite_difference():
    r = np.random.default_rng(3)
    emb = Embedding(7, 4, seed=3)
    ids = r.integers(0, 7, size=(3, 5))
    upstream = r.normal(size=(3, 5, 4))
    emb.forward(ids)
    emb.backward(upstream)
    dW, W0 = emb.dW.copy(), emb.W.copy()

    def L(W):
        keep = emb.W
        emb.W = W
        out = float((upstream * emb.forward(ids)).sum())
        emb.W = keep
        return out
    grad_check(L, W0, dW)


def test_hidden_embedding_backward_resets_each_call():
    emb = Embedding(4, 2)
    ids = np.array([[0, 1]])
    out = emb.forward(ids)
    emb.backward(np.ones_like(out))
    first = emb.dW.copy()
    emb.forward(ids)
    emb.backward(np.ones_like(out))
    assert_close(emb.dW, first)


def test_hidden_embedding_init_scale_and_determinism():
    a, b = Embedding(500, 64, seed=7), Embedding(500, 64, seed=7)
    assert_close(a.W, b.W)
    assert abs(a.W.std() - 1 / np.sqrt(64)) < 0.01  # Normal(0, 1) / sqrt(dim)


def test_hidden_embedding_does_not_alias_the_table():
    emb = Embedding(4, 3)
    out = emb.forward(np.array([[2]]))
    out[...] = 99.0
    assert np.all(emb.W != 99.0)  # fancy indexing copies; the output must not be a view into W


def test_hidden_sinusoidal_matches_definition_and_scales():
    pe = sinusoidal_pe(10, 8)
    for pos in (0, 3, 9):
        for i in range(4):
            a = pos / 10000.0 ** (2 * i / 8)
            assert_close(pe[pos, 2 * i], np.sin(a))
            assert_close(pe[pos, 2 * i + 1], np.cos(a))
    wide = sinusoidal_pe(4, 16, base=100.0)
    assert_close(wide[2, 2], np.sin(2 / 100.0 ** (2 / 16)))


def test_hidden_sinusoidal_relative_offset_is_a_rotation():
    # sin/cos of (p + k) is a fixed linear map of sin/cos of p: the "relative position" property.
    pe = sinusoidal_pe(40, 6)
    k = 7
    for i in range(3):
        w = 1.0 / 10000.0 ** (2 * i / 6)
        R = np.array([[np.cos(k * w), np.sin(k * w)], [-np.sin(k * w), np.cos(k * w)]])
        for p in (0, 5, 20):
            # (sin, cos) at p+k = R @ (sin, cos) at p
            assert_close(R @ pe[p, 2 * i:2 * i + 2], pe[p + k, 2 * i:2 * i + 2])


def test_hidden_sinusoidal_rejects_odd_dimension():
    try:
        sinusoidal_pe(4, 5)
    except ValueError:
        return
    raise AssertionError("an odd d has no sin/cos pairs and must raise ValueError")


def test_hidden_rope_matches_pairwise_rotation():
    x = np.random.default_rng(1).normal(size=(2, 4, 6))
    y = rope(x)
    for t in range(4):
        for i in range(3):
            a = t * 10000.0 ** (-2 * i / 6)
            assert_close(y[:, t, 2 * i], x[:, t, 2 * i] * np.cos(a) - x[:, t, 2 * i + 1] * np.sin(a))
            assert_close(y[:, t, 2 * i + 1], x[:, t, 2 * i] * np.sin(a) + x[:, t, 2 * i + 1] * np.cos(a))


def test_hidden_rope_inverse_undoes_rope():
    x = np.random.default_rng(2).normal(size=(3, 9, 8))
    assert_close(rope(rope(x), inverse=True), x)


def test_hidden_rope_scores_depend_only_on_relative_position():
    # The point of RoPE: <rope(q) at m, rope(k) at n> depends on m - n only.
    r = np.random.default_rng(4)
    q, k = r.normal(size=8), r.normal(size=8)
    T = 12
    Q = rope(np.tile(q, (1, T, 1)))[0]
    K = rope(np.tile(k, (1, T, 1)))[0]
    for d in (0, 1, 4):
        scores = [float(Q[m] @ K[m - d]) for m in range(d, T)]
        assert_close(np.array(scores), np.full(len(scores), scores[0]))
    assert abs(float(Q[5] @ K[2]) - float(Q[5] @ K[4])) > 1e-6  # and it does change with the offset


def test_hidden_rope_backward_is_the_inverse_rotation_finite_difference():
    r = np.random.default_rng(5)
    x = r.normal(size=(2, 5, 6))
    upstream = r.normal(size=(2, 5, 6))
    dx = rope(upstream, inverse=True)  # dL/dx for L = sum(upstream * rope(x))
    grad_check(lambda z: float((upstream * rope(z)).sum()), x, dx)


def test_hidden_rope_does_not_mutate_input_and_rejects_odd_dimension():
    x = np.random.default_rng(6).normal(size=(1, 3, 4))
    before = x.copy()
    rope(x)
    assert_close(x, before)
    try:
        rope(np.zeros((1, 2, 5)))
    except ValueError:
        return
    raise AssertionError("an odd D has no pairs and must raise ValueError")
