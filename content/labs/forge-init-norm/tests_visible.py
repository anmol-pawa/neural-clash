import numpy as np
from nc_test import assert_close


def test_init_stds():
    assert_close(he_std(50), np.sqrt(2 / 50))
    assert_close(xavier_std(30, 70), np.sqrt(2 / 100))


def test_init_weights_shape():
    assert init_weights(7, 3, "xavier").shape == (7, 3)


def test_batchnorm_output_is_standardised():
    r = np.random.default_rng(0)
    y = BatchNorm1d(3).forward(r.normal(size=(64, 3)) * 5 + 2)
    assert_close(y.mean(axis=0), np.zeros(3), atol=1e-8)
    assert_close(y.var(axis=0), np.ones(3), atol=1e-3)


def test_layernorm_rows_are_standardised():
    r = np.random.default_rng(1)
    y = LayerNorm(6).forward(r.normal(size=(4, 6)) * 3 + 1)
    assert_close(y.mean(axis=-1), np.zeros(4), atol=1e-8)
