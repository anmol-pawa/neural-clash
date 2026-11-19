import numpy as np
from nc_test import assert_close


def test_embedding_is_a_row_lookup():
    emb = Embedding(6, 4, seed=1)
    out = emb.forward(np.array([[0, 5, 5], [2, 2, 1]]))
    assert out.shape == (2, 3, 4)
    assert_close(out[0, 1], emb.W[5])
    assert_close(out[1, 0], emb.W[2])


def test_embedding_gradient_shape():
    emb = Embedding(6, 4)
    out = emb.forward(np.array([[1, 2, 3]]))
    assert emb.backward(np.ones_like(out)) is None
    assert emb.dW.shape == emb.W.shape


def test_sinusoidal_first_rows():
    pe = sinusoidal_pe(3, 4)
    assert pe.shape == (3, 4)
    assert_close(pe[0], np.array([0.0, 1.0, 0.0, 1.0]))  # position 0: sin 0, cos 0 in every pair
    assert_close(pe[1, :2], np.array([np.sin(1.0), np.cos(1.0)]))


def test_rope_leaves_position_zero_alone_and_keeps_norms():
    x = np.random.default_rng(0).normal(size=(2, 5, 6))
    y = rope(x)
    assert y.shape == x.shape
    assert_close(y[:, 0], x[:, 0])
    assert_close(np.linalg.norm(y, axis=-1), np.linalg.norm(x, axis=-1))  # a rotation never changes length
