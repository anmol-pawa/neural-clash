import numpy as np
from nc_test import assert_close


def test_causal_mask_is_lower_triangular():
    m = causal_mask(3)
    assert m.dtype == bool
    assert m.tolist() == [[True, False, False], [True, True, False], [True, True, True]]


def test_masked_softmax_rows_sum_to_one_and_respect_the_mask():
    s = np.array([[1.0, 2.0, 3.0], [0.0, 0.0, 0.0]])
    keep = np.array([[True, True, False], [True, True, True]])
    p = masked_softmax(s, keep)
    assert_close(p.sum(axis=-1), np.ones(2))
    assert p[0, 2] == 0.0
    assert_close(p[1], np.full(3, 1 / 3))


def test_sdpa_hand_example():
    # Two tokens, d = 4. Query 0 matches key 0 exactly; scores are [2/2, 0] = [1, 0].
    Q = np.array([[[2.0, 0, 0, 0], [0.0, 2, 0, 0]]])
    K = np.array([[[1.0, 0, 0, 0], [0.0, 0, 1, 0]]])
    V = np.array([[[10.0, 0], [0.0, 10]]])
    out, A = sdpa(Q, K, V)
    p = np.exp(1) / (np.exp(1) + 1)
    assert_close(A[0, 0], np.array([p, 1 - p]))
    assert_close(out[0, 0], np.array([10 * p, 10 * (1 - p)]))
    assert_close(A[0, 1], np.array([0.5, 0.5]))  # query 1 matches neither key


def test_multihead_shapes_and_causality():
    mha = MultiHeadAttention(8, 2, seed=1)
    x = np.random.default_rng(0).normal(size=(2, 5, 8))
    y = mha.forward(x)
    assert y.shape == (2, 5, 8)
    assert mha.attn.shape == (2, 2, 5, 5)
    assert np.all(np.triu(mha.attn[0, 0], 1) == 0)  # nothing flows from the future
    dx = mha.backward(np.ones_like(y))
    assert dx.shape == x.shape and mha.dWq.shape == mha.Wq.shape
