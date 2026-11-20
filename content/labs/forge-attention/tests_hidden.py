import numpy as np
from nc_test import assert_close, grad_check


def _rng(s):
    return np.random.default_rng(s)


def test_hidden_causal_mask_sizes():
    for T in (1, 2, 6):
        m = causal_mask(T)
        assert m.shape == (T, T) and m.dtype == bool
        assert np.array_equal(m, np.arange(T)[:, None] >= np.arange(T)[None, :])


def test_hidden_masked_softmax_is_stable_for_huge_scores():
    s = np.array([[1000.0, 1001.0, 999.0], [-1000.0, -1001.0, -999.0]])
    p = masked_softmax(s)
    assert np.all(np.isfinite(p))
    assert_close(p.sum(axis=-1), np.ones(2))
    z = np.exp(s - s.max(axis=-1, keepdims=True))
    assert_close(p, z / z.sum(axis=-1, keepdims=True))
    keep = np.array([[True, True, False], [True, False, True]])
    q = masked_softmax(s, keep)
    assert np.all(np.isfinite(q)) and np.all(q[~keep] == 0)
    assert_close(q.sum(axis=-1), np.ones(2))


def test_hidden_masked_softmax_matches_renormalised_subset():
    s = _rng(0).normal(size=(4, 6))
    keep = _rng(1).random((4, 6)) < 0.6
    keep[:, 0] = True
    q = masked_softmax(s, keep)
    for i in range(4):
        sub = np.exp(s[i, keep[i]] - s[i, keep[i]].max())
        assert_close(q[i, keep[i]], sub / sub.sum())
        assert np.all(q[i, ~keep[i]] == 0)


def test_hidden_fully_masked_row_is_zeros_not_nan():
    s = _rng(2).normal(size=(3, 4))
    keep = np.ones((3, 4), dtype=bool)
    keep[1] = False
    q = masked_softmax(s, keep)
    assert np.all(np.isfinite(q))
    assert np.all(q[1] == 0)
    assert_close(q[[0, 2]].sum(axis=-1), np.ones(2))


def test_hidden_sdpa_scale_is_sqrt_of_head_dim():
    # With unit-variance q and k, q.k has variance d. Dividing by sqrt(d) keeps the scores near 1.
    d = 64
    Q = _rng(3).normal(size=(1, 200, d))
    K = _rng(4).normal(size=(1, 200, d))
    V = np.zeros((1, 200, 1))
    _, A = sdpa(Q, K, V)
    scores = (Q @ np.swapaxes(K, -1, -2) / np.sqrt(d))
    z = np.exp(scores - scores.max(axis=-1, keepdims=True))
    assert_close(A, z / z.sum(axis=-1, keepdims=True))
    # and a fixed example pins the divisor
    Q1 = np.array([[[4.0, 0.0, 0.0, 0.0]]])
    K1 = np.array([[[1.0, 0, 0, 0], [0.0, 0, 0, 0]]])
    _, A1 = sdpa(Q1, K1, np.zeros((1, 2, 1)))
    assert_close(A1[0, 0, 0], np.exp(2.0) / (np.exp(2.0) + 1.0))


def test_hidden_sdpa_rows_are_distributions_that_mix_values():
    Q, K, V = (_rng(s).normal(size=(2, 3, 5, 4)) for s in (5, 6, 7))
    out, A = sdpa(Q, K, V)
    assert out.shape == (2, 3, 5, 4) and A.shape == (2, 3, 5, 5)
    assert_close(A.sum(axis=-1), np.ones((2, 3, 5)))
    assert_close(out, A @ V)


def test_hidden_future_tokens_cannot_leak_through_a_causal_mask():
    T = 6
    Q, K, V = (_rng(s).normal(size=(1, T, 4)) for s in (8, 9, 10))
    out, _ = sdpa(Q, K, V, causal_mask(T))
    K2, V2 = K.copy(), V.copy()
    K2[:, 4:] += 5.0
    V2[:, 4:] -= 7.0
    out2, _ = sdpa(Q, K2, V2, causal_mask(T))
    assert_close(out[:, :4], out2[:, :4])  # rows 0..3 never saw keys 4..5
    assert not np.allclose(out[:, 4:], out2[:, 4:])
    # the first token can only attend to itself, so it returns its own value vector
    assert_close(out[:, 0], V[:, 0])


def test_hidden_padding_mask_gives_zero_weight_to_padded_keys():
    Q, K, V = (_rng(s).normal(size=(2, 5, 3)) for s in (11, 12, 13))
    keep = np.array([[True] * 5, [True, True, True, False, False]])[:, None, :]  # (N, 1, Tk)
    out, A = sdpa(Q, K, V, keep)
    assert np.all(A[1, :, 3:] == 0)
    V2 = V.copy()
    V2[1, 3:] = 999.0
    out2, _ = sdpa(Q, K, V2, keep)
    assert_close(out[1], out2[1])


def test_hidden_sdpa_backward_finite_differences():
    r = _rng(14)
    Q, K, V = (r.normal(size=(2, 5, 4)) for _ in range(3))
    mask = causal_mask(5)
    up = r.normal(size=(2, 5, 4))
    out, A = sdpa(Q, K, V, mask)
    dQ, dK, dV = sdpa_backward(up, Q, K, V, A)

    def L(q=None, k=None, v=None):
        o, _ = sdpa(Q if q is None else q, K if k is None else k, V if v is None else v, mask)
        return float((up * o).sum())
    grad_check(lambda q: L(q=q), Q, dQ)
    grad_check(lambda k: L(k=k), K, dK)
    grad_check(lambda v: L(v=v), V, dV)


def test_hidden_sdpa_backward_without_mask_and_with_head_axis():
    r = _rng(15)
    Q, K, V = (r.normal(size=(2, 2, 3, 4)) for _ in range(3))
    up = r.normal(size=(2, 2, 3, 4))
    out, A = sdpa(Q, K, V)
    dQ, dK, dV = sdpa_backward(up, Q, K, V, A)
    grad_check(lambda q: float((up * sdpa(q, K, V)[0]).sum()), Q, dQ)
    grad_check(lambda k: float((up * sdpa(Q, k, V)[0]).sum()), K, dK)


def test_hidden_masked_entries_get_no_score_gradient():
    # Keys that are masked out cannot receive gradient from the queries that skip them.
    r = _rng(16)
    Q, K, V = (r.normal(size=(1, 4, 3)) for _ in range(3))
    mask = causal_mask(4)
    out, A = sdpa(Q, K, V, mask)
    up = np.zeros_like(out)
    up[:, 0] = 1.0  # only token 0 has a loss; it sees only key 0
    dQ, dK, dV = sdpa_backward(up, Q, K, V, A)
    assert np.all(dK[:, 1:] == 0) and np.all(dV[:, 1:] == 0)
    assert np.all(dQ[:, 1:] == 0)


def test_hidden_multihead_matches_a_per_head_loop():
    r = _rng(17)
    mha = MultiHeadAttention(8, 4, seed=3)
    x = r.normal(size=(2, 5, 8))
    y = mha.forward(x)
    q, k, v = x @ mha.Wq, x @ mha.Wk, x @ mha.Wv
    dh = 2
    ctx = np.zeros_like(x)
    for n in range(2):
        for h in range(4):
            sl = slice(h * dh, (h + 1) * dh)  # head h owns a contiguous block of dh feature columns
            s = q[n][:, sl] @ k[n][:, sl].T / np.sqrt(dh)
            s = np.where(causal_mask(5), s, -np.inf)
            e = np.exp(s - s.max(axis=-1, keepdims=True))
            a = e / e.sum(axis=-1, keepdims=True)
            ctx[n][:, sl] = a @ v[n][:, sl]
            assert_close(mha.attn[n, h], a)
    assert_close(y, ctx @ mha.Wo)


def test_hidden_multihead_noncausal_flag_and_validation():
    mha = MultiHeadAttention(6, 3, seed=0)
    x = _rng(18).normal(size=(1, 4, 6))
    mha.forward(x, causal=False)
    assert np.all(mha.attn > 0)
    mha.forward(x, causal=True)
    assert np.all(np.triu(mha.attn[0, 0], 1) == 0)
    try:
        MultiHeadAttention(7, 2)
    except ValueError:
        pass
    else:
        raise AssertionError("d_model not divisible by n_heads must raise ValueError")


def test_hidden_multihead_single_head_equals_sdpa_with_projections():
    x = _rng(19).normal(size=(2, 4, 6))
    mha = MultiHeadAttention(6, 1, seed=5)
    y = mha.forward(x)
    out, _ = sdpa(x @ mha.Wq, x @ mha.Wk, x @ mha.Wv, causal_mask(4))
    assert_close(y, out @ mha.Wo)


def test_hidden_multihead_is_permutation_equivariant_without_a_mask():
    # No mask and no positions: shuffling tokens just shuffles outputs. (This is why position must be added.)
    x = _rng(20).normal(size=(1, 5, 8))
    perm = np.array([3, 0, 4, 1, 2])
    mha = MultiHeadAttention(8, 2, seed=2)
    y = mha.forward(x, causal=False)
    yp = mha.forward(x[:, perm], causal=False)
    assert_close(yp, y[:, perm])


def test_hidden_multihead_backward_finite_differences():
    r = _rng(21)
    mha = MultiHeadAttention(6, 2, seed=4)
    x = r.normal(size=(2, 4, 6))
    up = r.normal(size=(2, 4, 6))
    mha.forward(x)
    dx = mha.backward(up)
    grads = [g.copy() for g in mha.grads()]

    def L_x(xx):
        return float((up * mha.forward(xx)).sum())
    grad_check(L_x, x, dx)

    for name, g in zip(("Wq", "Wk", "Wv", "Wo"), grads):
        W0 = getattr(mha, name).copy()

        def L_w(W, name=name, W0=W0):
            setattr(mha, name, W)
            val = float((up * mha.forward(x)).sum())
            setattr(mha, name, W0)
            return val
        grad_check(L_w, W0, g)


def test_hidden_multihead_noncausal_backward_finite_differences():
    r = _rng(22)
    mha = MultiHeadAttention(4, 2, seed=6)
    x = r.normal(size=(1, 3, 4))
    up = r.normal(size=(1, 3, 4))
    mha.forward(x, causal=False)
    dx = mha.backward(up)
    grad_check(lambda xx: float((up * mha.forward(xx, causal=False)).sum()), x, dx)


def test_hidden_multihead_backward_resets_and_is_deterministic():
    x = _rng(23).normal(size=(1, 3, 4))
    mha = MultiHeadAttention(4, 2, seed=1)
    y = mha.forward(x)
    mha.backward(np.ones_like(y))
    first = [g.copy() for g in mha.grads()]
    mha.forward(x)
    mha.backward(np.ones_like(y))
    for a, b in zip(first, mha.grads()):
        assert_close(a, b)
    again = MultiHeadAttention(4, 2, seed=1)
    for a, b in zip(mha.params(), again.params()):
        assert_close(a, b)
    assert not np.allclose(mha.Wq, mha.Wk)  # four separate draws, not one reused matrix


def test_hidden_inputs_are_not_mutated():
    r = _rng(24)
    Q, K, V = (r.normal(size=(1, 3, 4)) for _ in range(3))
    copies = [a.copy() for a in (Q, K, V)]
    out, A = sdpa(Q, K, V, causal_mask(3))
    sdpa_backward(np.ones_like(out), Q, K, V, A)
    for a, c in zip((Q, K, V), copies):
        assert_close(a, c)
