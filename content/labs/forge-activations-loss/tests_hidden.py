import numpy as np
from nc_test import assert_close, grad_check


def _act_check(make, x):
    layer = make()
    up = np.random.default_rng(0).normal(size=x.shape)
    layer.forward(x)
    dx = layer.backward(up)
    assert dx.shape == x.shape
    grad_check(lambda xx: float((up * make().forward(xx)).sum()), x, dx)


def test_hidden_activation_gradients_by_finite_differences():
    r = np.random.default_rng(1)
    x = r.normal(size=(4, 5)) + 0.05  # keep away from the ReLU kink at 0
    x[np.abs(x) < 0.05] += 0.2
    for make in (ReLU, Tanh, Sigmoid):
        _act_check(make, x)


def test_hidden_activation_values():
    x = np.array([-2.0, -0.5, 0.0, 0.5, 2.0])
    assert_close(ReLU().forward(x), np.maximum(x, 0))
    assert_close(Tanh().forward(x), np.tanh(x))
    assert_close(Sigmoid().forward(x), 1 / (1 + np.exp(-x)))


def test_hidden_relu_gradient_is_zero_at_zero():
    layer = ReLU()
    layer.forward(np.array([0.0, 1.0, -1.0]))
    assert_close(layer.backward(np.ones(3)), [0.0, 1.0, 0.0])


def test_hidden_sigmoid_is_stable_for_huge_inputs():
    with np.errstate(over="raise", invalid="raise", divide="raise"):
        layer = Sigmoid()
        y = layer.forward(np.array([-1000.0, -50.0, 0.0, 50.0, 1000.0]))
        dx = layer.backward(np.ones(5))
    assert_close(y, [0.0, 1.9287498479639178e-22, 0.5, 1.0, 1.0], atol=1e-12)
    assert np.isfinite(dx).all()


def test_hidden_softmax_ce_value_by_hand():
    logits = np.array([[2.0, 1.0, 0.1], [0.0, 0.0, 0.0]])
    p = np.exp(logits) / np.exp(logits).sum(axis=1, keepdims=True)
    loss, _ = softmax_cross_entropy(logits, np.array([0, 2]))
    assert_close(loss, -(np.log(p[0, 0]) + np.log(p[1, 2])) / 2)


def test_hidden_softmax_ce_gradient_is_p_minus_onehot_over_n():
    r = np.random.default_rng(2)
    logits, t = r.normal(size=(6, 4)), np.array([0, 1, 2, 3, 0, 1])
    _, g = softmax_cross_entropy(logits, t)
    p = np.exp(logits) / np.exp(logits).sum(axis=1, keepdims=True)
    assert_close(g, (p - np.eye(4)[t]) / 6)
    grad_check(lambda z: softmax_cross_entropy(z, t)[0], logits, g)


def test_hidden_softmax_ce_survives_huge_logits():
    with np.errstate(over="raise", invalid="raise", divide="raise"):
        loss, g = softmax_cross_entropy(np.array([[1000.0, 0.0, -1000.0], [-1000.0, 1000.0, 5.0]]), np.array([0, 2]))
    assert np.isfinite(loss) and np.isfinite(g).all()
    assert_close(loss, (0.0 + 995.0) / 2, atol=1e-9)


def test_hidden_softmax_ce_is_shift_invariant():
    r = np.random.default_rng(3)
    z, t = r.normal(size=(5, 3)), np.array([0, 1, 2, 1, 0])
    l1, g1 = softmax_cross_entropy(z, t)
    l2, g2 = softmax_cross_entropy(z + 123.0, t)
    assert_close(l1, l2)
    assert_close(g1, g2)


def test_hidden_softmax_ce_does_not_modify_its_input():
    z = np.array([[1.0, 2.0, 3.0]])
    keep = z.copy()
    softmax_cross_entropy(z, np.array([2]))
    assert_close(z, keep)


def test_hidden_mse_value_and_gradient():
    r = np.random.default_rng(4)
    p, t = r.normal(size=(3, 4)), r.normal(size=(3, 4))
    loss, g = mse_loss(p, t)
    assert_close(loss, ((p - t) ** 2).mean())
    grad_check(lambda x: mse_loss(x, t)[0], p, g)


def test_hidden_bce_matches_definition_and_gradient():
    r = np.random.default_rng(5)
    z, y = r.normal(size=(7,)) * 2, np.array([0, 1, 1, 0, 1, 0, 0.0])
    s = 1 / (1 + np.exp(-z))
    loss, g = bce_with_logits(z, y)
    assert_close(loss, -(y * np.log(s) + (1 - y) * np.log(1 - s)).mean())
    grad_check(lambda x: bce_with_logits(x, y)[0], z, g)


def test_hidden_bce_is_finite_for_extreme_logits():
    with np.errstate(over="raise", invalid="raise", divide="raise"):
        loss, g = bce_with_logits(np.array([800.0, -800.0, 800.0]), np.array([1.0, 0.0, 0.0]))
    assert np.isfinite(loss) and np.isfinite(g).all()
    assert_close(loss, 800.0 / 3, atol=1e-9)
