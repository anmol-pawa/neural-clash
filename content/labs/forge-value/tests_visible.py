import math
from nc_test import assert_close


def test_forward_values():
    a, b = Value(2.0), Value(-3.0)
    assert_close((a * b + 1).data, -5.0)
    assert_close((a - b).data, 5.0)
    assert_close((a / b).data, 2.0 / -3.0)


def test_simple_gradients():
    a, b = Value(2.0), Value(-3.0)
    c = a * b + a
    c.backward()
    assert_close(a.grad, b.data + 1.0)
    assert_close(b.grad, a.data)


def test_reuse_accumulates():
    x = Value(3.0)
    y = x * x
    y.backward()
    assert_close(x.grad, 6.0)


def test_numbers_on_either_side():
    x = Value(4.0)
    y = 2 * x + 1 - (1 / x)
    y.backward()
    assert_close(y.data, 2 * 4 + 1 - 0.25)
    assert_close(x.grad, 2 + 1 / 16)
