import numpy as np
from nc_test import assert_close


def test_relu_forward_and_backward():
    layer = ReLU()
    assert_close(layer.forward(np.array([-1.0, 2.0])), [0.0, 2.0])
    assert_close(layer.backward(np.array([5.0, 5.0])), [0.0, 5.0])


def test_softmax_cross_entropy_uniform_logits():
    loss, grad = softmax_cross_entropy(np.zeros((2, 4)), np.array([0, 3]))
    assert_close(loss, np.log(4.0))
    assert grad.shape == (2, 4)


def test_mse_of_equal_arrays_is_zero():
    loss, grad = mse_loss(np.ones((2, 2)), np.ones((2, 2)))
    assert_close(loss, 0.0)
    assert_close(grad, np.zeros((2, 2)))
