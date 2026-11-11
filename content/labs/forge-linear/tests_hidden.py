import numpy as np
from nc_test import assert_close, grad_check


def _layer(in_dim, out_dim, seed):
    r = np.random.default_rng(seed)
    layer = Linear(in_dim, out_dim)
    layer.W = r.normal(size=(in_dim, out_dim))
    layer.b = r.normal(size=out_dim)
    return layer, r


def _check_all(layer, x, upstream):
    """Objective L = sum(upstream * layer(x)); compare dx, dW, db with central differences."""
    layer.forward(x)
    dx = layer.backward(upstream)

    def L(xx=None, W=None, b=None):
        keep = (layer.W, layer.b)
        if W is not None:
            layer.W = W
        if b is not None:
            layer.b = b
        out = float((upstream * layer.forward(x if xx is None else xx)).sum())
        layer.W, layer.b = keep
        return out
    W0, b0 = layer.W.copy(), layer.b.copy()
    assert dx.shape == x.shape, f"dx shape {dx.shape} != {x.shape}"
    grad_check(lambda xx: L(xx=xx), x, dx)
    layer.forward(x)
    layer.backward(upstream)  # state may have been disturbed by L(); recompute
    grad_check(lambda W: L(W=W), W0, layer.dW)
    grad_check(lambda b: L(b=b), b0, layer.db)


def test_hidden_finite_difference_2d():
    layer, r = _layer(4, 3, 1)
    _check_all(layer, r.normal(size=(6, 4)), r.normal(size=(6, 3)))


def test_hidden_finite_difference_3d_leading_axes():
    layer, r = _layer(5, 2, 2)
    _check_all(layer, r.normal(size=(3, 4, 5)), r.normal(size=(3, 4, 2)))


def test_hidden_single_example_and_single_output():
    layer, r = _layer(3, 1, 3)
    _check_all(layer, r.normal(size=(1, 3)), r.normal(size=(1, 1)))


def test_hidden_known_values_by_hand():
    layer = Linear(2, 2)
    layer.W = np.array([[1.0, 2.0], [3.0, 4.0]])
    layer.b = np.array([0.0, 1.0])
    x = np.array([[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]])
    assert_close(layer.forward(x), [[1, 3], [3, 5], [4, 7]])
    dout = np.array([[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]])
    dx = layer.backward(dout)
    assert_close(layer.dW, x.T @ dout)
    assert_close(layer.db, [2.0, 2.0])
    assert_close(dx, dout @ layer.W.T)


def test_hidden_gradients_are_set_not_accumulated():
    layer, r = _layer(3, 2, 4)
    x, d = r.normal(size=(5, 3)), r.normal(size=(5, 2))
    layer.forward(x)
    layer.backward(d)
    first_dW, first_db = layer.dW.copy(), layer.db.copy()
    layer.forward(x)
    layer.backward(d)
    assert_close(layer.dW, first_dW)
    assert_close(layer.db, first_db)


def test_hidden_backward_uses_the_input_of_its_own_forward():
    layer, r = _layer(3, 2, 5)
    x1, x2 = r.normal(size=(4, 3)), r.normal(size=(4, 3))
    d = r.normal(size=(4, 2))
    layer.forward(x1)
    layer.forward(x2)
    layer.backward(d)
    assert_close(layer.dW, x2.T @ d)


def test_hidden_cached_input_is_not_aliased_by_later_in_place_edits():
    layer, r = _layer(3, 2, 6)
    x = r.normal(size=(4, 3))
    snapshot = x.copy()
    d = r.normal(size=(4, 2))
    layer.forward(x)
    x[:] = 0.0  # the caller reuses its buffer; the layer must still differentiate the original input
    layer.backward(d)
    assert_close(layer.dW, snapshot.T @ d)


def test_hidden_init_is_seeded_and_scaled():
    a, b = Linear(100, 50, seed=7), Linear(100, 50, seed=7)
    assert_close(a.W, b.W)
    assert not np.allclose(a.W, Linear(100, 50, seed=8).W)
    assert not a.b.any()
    assert abs(a.W.std() - 0.1) < 0.01  # Normal(0, 1/in_dim) -> std = 1/sqrt(100)
    assert a.dW.shape == a.W.shape and not a.dW.any()
