import numpy as np
from nc_test import assert_close


def test_gelu_known_values():
    y = gelu(np.array([-3.0, 0.0, 1.0, 3.0]))
    assert_close(y, np.array([-0.003637, 0.0, 0.841192, 2.996363]), rtol=0, atol=1e-5)


def test_layernorm_normalises_each_token():
    x = np.random.default_rng(0).normal(3.0, 5.0, size=(2, 4, 8))
    y = LayerNorm(8).forward(x)
    assert_close(y.mean(axis=-1), np.zeros((2, 4)), atol=1e-9)
    assert_close(y.var(axis=-1), np.ones((2, 4)), rtol=1e-3)


def test_block_shapes_and_residual_stream():
    blk = TransformerBlock(8, 2, 32, seed=1)
    x = np.random.default_rng(1).normal(size=(2, 5, 8))
    y = blk.forward(x)
    assert y.shape == x.shape
    assert blk.attn_weights.shape == (2, 2, 5, 5)
    dx = blk.backward(np.ones_like(y))
    assert dx.shape == x.shape
    assert [g.shape for g in blk.grads()] == [p.shape for p in blk.params()]


def test_counts_hand_example():
    # d_model = 8, d_ff = 32: attention 4*64 = 256, FFN 2*8*32 + 32 + 8 = 552, two norms 32.
    assert block_param_count(8, 32) == 256 + 552 + 32
    # T = 4: projections 8*4*64 = 2048, attention 4*16*8 = 512, FFN 4*4*8*32 = 4096.
    assert block_flops(4, 8, 32) == 2048 + 512 + 4096
