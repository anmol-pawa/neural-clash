import numpy as np
from nc_test import assert_close, grad_check


def _data(seed, n=7, d=4, c=3):
    r = np.random.default_rng(seed)
    return r.normal(size=(n, d)), r.integers(0, c, size=n)


def _randomise(net, seed):
    r = np.random.default_rng(seed)
    for p in net.params():
        p[...] = r.normal(size=p.shape) * 0.7


def _check_net(sizes, activation, seed):
    X, y = _data(seed, d=sizes[0], c=sizes[-1])
    net = MLP(sizes, activation, seed=seed)
    _randomise(net, seed + 100)
    net.loss_and_backward(X, y)
    analytic = [g.copy() for g in net.grads()]
    for idx, p in enumerate(net.params()):
        def f(v, idx=idx):
            saved = net.params()[idx].copy()
            net.params()[idx][...] = v
            val = net.loss_and_backward(X, y)
            net.params()[idx][...] = saved
            return val
        grad_check(f, p.copy(), analytic[idx], tol=1e-6)


def test_hidden_gradient_check_one_hidden_tanh():
    _check_net([4, 5, 3], "tanh", 1)


def test_hidden_gradient_check_two_hidden_tanh():
    _check_net([4, 6, 5, 3], "tanh", 2)


def test_hidden_gradient_check_three_hidden_relu():
    # random continuous data keeps pre-activations away from the ReLU kink
    _check_net([4, 7, 6, 5, 3], "relu", 3)


def test_hidden_no_hidden_layer_is_softmax_regression():
    X, y = _data(4)
    net = MLP([4, 3], "tanh", seed=4)
    _randomise(net, 5)
    loss = net.loss_and_backward(X, y)
    z = X @ net.params()[0] + net.params()[1]
    p = np.exp(z - z.max(1, keepdims=True))
    p /= p.sum(1, keepdims=True)
    assert_close(loss, -np.log(p[np.arange(len(y)), y]).mean())
    d = p.copy()
    d[np.arange(len(y)), y] -= 1
    assert_close(net.grads()[0], X.T @ d / len(y))
    assert_close(net.grads()[1], d.mean(axis=0))


def test_hidden_logits_are_not_squashed():
    net = MLP([2, 3, 2], "tanh", seed=0)
    net.params()[2][...] = 50.0
    out = net.forward(np.ones((1, 2)))
    assert np.abs(out).max() > 1.0  # tanh on the output layer would cap it at 1


def test_hidden_init_is_seeded_and_fan_in_scaled():
    a, b = MLP([200, 100, 3], seed=9), MLP([200, 100, 3], seed=9)
    for p, q in zip(a.params(), b.params()):
        assert_close(p, q)
    assert abs(a.params()[0].std() - np.sqrt(1 / 200)) < 0.005
    assert not a.params()[1].any()


def test_hidden_step_updates_parameters_in_place():
    net = MLP([3, 4, 2], seed=0)
    held = net.params()
    before = [p.copy() for p in held]
    X, y = _data(6, d=3, c=2)
    net.loss_and_backward(X, y)
    g = [x.copy() for x in net.grads()]
    net.step(0.1)
    for p, b, gg in zip(held, before, g):
        assert_close(p, b - 0.1 * gg)  # the arrays held *before* the step moved
        assert p is not None


def test_hidden_loss_goes_down_downhill():
    X, y = _data(7, n=30, d=4, c=3)
    net = MLP([4, 8, 3], "tanh", seed=1)
    start = net.loss_and_backward(X, y)
    for _ in range(50):
        net.loss_and_backward(X, y)
        net.step(0.2)
    assert net.loss_and_backward(X, y) < start * 0.8


def test_hidden_learns_xor_with_tanh():
    X = np.array([[0, 0], [0, 1], [1, 0], [1, 1]], dtype=float)
    y = np.array([0, 1, 1, 0])
    net = MLP([2, 8, 2], "tanh", seed=0)
    for _ in range(1500):
        net.loss_and_backward(X, y)
        net.step(0.5)
    assert list(net.predict(X)) == [0, 1, 1, 0]
    assert net.loss_and_backward(X, y) < 0.05


def test_hidden_learns_xor_with_relu():
    X = np.array([[0, 0], [0, 1], [1, 0], [1, 1]], dtype=float)
    y = np.array([0, 1, 1, 0])
    net = MLP([2, 16, 2], "relu", seed=0)
    for _ in range(1500):
        net.loss_and_backward(X, y)
        net.step(0.3)
    assert list(net.predict(X)) == [0, 1, 1, 0]


def test_hidden_a_linear_model_cannot_learn_xor():
    X = np.array([[0, 0], [0, 1], [1, 0], [1, 1]], dtype=float)
    y = np.array([0, 1, 1, 0])
    net = MLP([2, 2], seed=0)
    for _ in range(800):
        net.loss_and_backward(X, y)
        net.step(0.5)
    assert (net.predict(X) == y).sum() <= 3
    assert net.loss_and_backward(X, y) > 0.6


def test_hidden_gradients_are_independent_per_call():
    X, y = _data(8)
    net = MLP([4, 5, 3], seed=2)
    net.loss_and_backward(X, y)
    first = [g.copy() for g in net.grads()]
    net.loss_and_backward(X, y)
    for g, f in zip(net.grads(), first):
        assert_close(g, f)


def test_hidden_loss_survives_huge_logits():
    net = MLP([2, 3, 2], "tanh", seed=0)
    net.params()[2][...] = np.array([[1e5, -1e5]] * 3)
    X, y = np.ones((2, 2)), np.array([0, 1])
    with np.errstate(over="raise", invalid="raise", divide="raise"):
        loss = net.loss_and_backward(X, y)
    assert np.isfinite(loss) and all(np.isfinite(g).all() for g in net.grads())
