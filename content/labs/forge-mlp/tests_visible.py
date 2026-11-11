import numpy as np
from nc_test import assert_close


def test_shapes_follow_sizes():
    net = MLP([3, 5, 2])
    assert [p.shape for p in net.params()] == [(3, 5), (5,), (5, 2), (2,)]
    assert net.forward(np.zeros((4, 3))).shape == (4, 2)


def test_loss_of_zero_weights_is_log_classes():
    net = MLP([2, 4, 3])
    for p in net.params():
        p[...] = 0.0
    loss = net.loss_and_backward(np.ones((5, 2)), np.array([0, 1, 2, 0, 1]))
    assert_close(loss, np.log(3.0))


def test_gradients_match_parameter_shapes():
    net = MLP([2, 3, 2])
    net.loss_and_backward(np.ones((4, 2)), np.array([0, 1, 0, 1]))
    assert [g.shape for g in net.grads()] == [p.shape for p in net.params()]
