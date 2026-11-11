import numpy as np
from nc_test import assert_close


def test_conv_identity_kernel_copies_the_image():
    conv = Conv2D(1, 1, 3, pad=1)
    conv.W = np.zeros((1, 1, 3, 3))
    conv.W[0, 0, 1, 1] = 1.0
    x = np.arange(16.0).reshape(1, 1, 4, 4)
    assert_close(conv.forward(x), x)


def test_conv_output_shape_follows_the_formula():
    conv = Conv2D(2, 5, 3, stride=2, pad=1)
    assert conv.forward(np.ones((4, 2, 8, 8))).shape == (4, 5, 4, 4)


def test_conv_gradient_shapes_match_parameters():
    conv = Conv2D(2, 3, 3)
    x = np.ones((2, 2, 6, 6))
    y = conv.forward(x)
    dx = conv.backward(np.ones_like(y))
    assert dx.shape == x.shape
    assert conv.dW.shape == conv.W.shape and conv.db.shape == conv.b.shape


def test_maxpool_picks_window_maxima():
    x = np.array([[[[1.0, 2.0, 0.0, 0.0], [3.0, 4.0, 0.0, 9.0], [5.0, 0.0, 1.0, 1.0], [0.0, 6.0, 1.0, 2.0]]]])
    assert_close(MaxPool2D(2).forward(x), [[[[4.0, 9.0], [6.0, 2.0]]]])


def test_maxpool_gradient_goes_only_to_the_winner():
    pool = MaxPool2D(2)
    x = np.array([[[[1.0, 2.0], [3.0, 4.0]]]])
    pool.forward(x)
    assert_close(pool.backward(np.array([[[[10.0]]]])), [[[[0.0, 0.0], [0.0, 10.0]]]])
