import numpy as np
from nc_test import assert_close


def test_forward_is_affine():
    layer = Linear(2, 3)
    layer.W = np.array([[1.0, 0.0, 2.0], [0.0, 1.0, -1.0]])
    layer.b = np.array([0.5, 0.5, 0.5])
    assert_close(layer.forward(np.array([[1.0, 2.0]])), [[1.5, 2.5, 0.5]])


def test_gradient_shapes_match_parameters():
    layer = Linear(4, 3)
    x = np.ones((5, 4))
    layer.forward(x)
    dx = layer.backward(np.ones((5, 3)))
    assert dx.shape == x.shape
    assert layer.dW.shape == layer.W.shape and layer.db.shape == layer.b.shape


def test_bias_gradient_sums_over_the_batch():
    layer = Linear(2, 2)
    layer.forward(np.zeros((6, 2)))
    layer.backward(np.ones((6, 2)))
    assert_close(layer.db, [6.0, 6.0])
