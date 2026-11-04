import numpy as np
from nc_test import assert_close


def test_forward_matches_numpy():
    a = Tensor([[1.0, 2.0], [3.0, 4.0]])
    b = Tensor([[0.5, -1.0], [2.0, 1.0]])
    assert_close((a @ b + 1).data, np.array([[1, 2], [3, 4.0]]) @ np.array([[0.5, -1], [2, 1.0]]) + 1)


def test_sum_gradient_is_ones():
    x = Tensor([[1.0, 2.0, 3.0], [4.0, 5.0, 6.0]])
    x.sum().backward()
    assert_close(x.grad, np.ones((2, 3)))


def test_bias_broadcast_gradient():
    x = Tensor(np.zeros((4, 3)))
    b = Tensor([1.0, 2.0, 3.0])
    (x + b).sum().backward()
    assert b.grad.shape == (3,)
    assert_close(b.grad, [4.0, 4.0, 4.0])


def test_matmul_gradient_shapes():
    a, b = Tensor(np.ones((2, 3))), Tensor(np.ones((3, 4)))
    (a @ b).sum().backward()
    assert a.grad.shape == (2, 3) and b.grad.shape == (3, 4)
