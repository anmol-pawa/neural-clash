import numpy as np
from nc_test import assert_close, grad_check


def _rnn(d, h, c, seed):
    r = np.random.default_rng(seed)
    net = RNN(d, h, c)
    net.Wxh = r.normal(size=net.Wxh.shape)
    net.Whh = r.normal(size=net.Whh.shape) * 0.7
    net.bh = r.normal(size=h) * 0.3
    net.Why = r.normal(size=net.Why.shape)
    net.by = r.normal(size=c)
    return net, r


def _check_rnn(net, x, up):
    """Objective L = sum(up * logits); compare every gradient with central differences."""
    net.forward(x)
    dx = net.backward(up)
    grads = [g.copy() for g in net.grads()]
    saved = [p.copy() for p in net.params()]
    assert dx.shape == x.shape, f"dx shape {dx.shape} != {x.shape}"

    def loss(xx=None, which=None, val=None):
        for p, s in zip(net.params(), saved):
            p[...] = s
        if which is not None:
            net.params()[which][...] = val
        return float((up * net.forward(x if xx is None else xx)).sum())
    grad_check(lambda xx: loss(xx=xx), x, dx)
    for i, (s, g) in enumerate(zip(saved, grads)):
        grad_check(lambda v, i=i: loss(which=i, val=v), s, g)
    for p, s in zip(net.params(), saved):
        p[...] = s


def test_hidden_bptt_finite_difference_short_and_long():
    for d, h, c, n, t, seed in [(2, 3, 2, 3, 1, 1), (3, 4, 2, 2, 5, 2), (1, 3, 1, 4, 9, 3)]:
        net, r = _rnn(d, h, c, seed)
        _check_rnn(net, r.normal(size=(n, t, d)), r.normal(size=(n, c)))


def test_hidden_known_two_step_values_by_hand():
    net = RNN(1, 1, 1)
    net.Wxh, net.Whh, net.bh = np.array([[1.0]]), np.array([[2.0]]), np.array([0.0])
    net.Why, net.by = np.array([[1.0]]), np.array([0.0])
    h1 = np.tanh(1.0)
    h2 = np.tanh(0.0 + 2.0 * h1)
    assert_close(net.forward(np.array([[[1.0], [0.0]]])), [[h2]])
    dx = net.backward(np.array([[1.0]]))
    da2 = 1 - h2 ** 2
    da1 = da2 * 2.0 * (1 - h1 ** 2)
    assert_close(dx, [[[da1], [da2]]])
    assert_close(net.dWhh, [[da2 * h1]])  # at t=1 only: h_0 = 0 contributes nothing at t=0


def test_hidden_state_is_reset_on_every_forward():
    net, r = _rnn(2, 3, 2, 4)
    x = r.normal(size=(2, 4, 2))
    first = net.forward(x).copy()
    assert_close(net.forward(x), first)


def test_hidden_gradients_are_set_not_accumulated():
    net, r = _rnn(2, 3, 2, 5)
    x, up = r.normal(size=(3, 4, 2)), r.normal(size=(3, 2))
    net.forward(x)
    net.backward(up)
    first = [g.copy() for g in net.grads()]
    net.forward(x)
    net.backward(up)
    for a, b in zip(first, net.grads()):
        assert_close(b, a)


def test_hidden_gradient_sums_over_the_batch_without_averaging():
    net, r = _rnn(2, 3, 2, 6)
    x, up = r.normal(size=(4, 3, 2)), r.normal(size=(4, 2))
    net.forward(x)
    net.backward(up)
    whole = [g.copy() for g in net.grads()]
    parts = [np.zeros_like(g) for g in whole]
    for i in range(4):
        net.forward(x[i:i + 1])
        net.backward(up[i:i + 1])
        for acc, g in zip(parts, net.grads()):
            acc += g
    for a, b in zip(whole, parts):
        assert_close(a, b, rtol=1e-9, atol=1e-10)


def test_hidden_early_inputs_receive_gradient_only_through_the_recurrence():
    net, r = _rnn(2, 3, 2, 7)
    x, up = r.normal(size=(2, 6, 2)), r.normal(size=(2, 2))
    net.forward(x)
    live = net.backward(up)
    assert np.abs(live[:, 0]).max() > 1e-6
    net.Whh = np.zeros_like(net.Whh)
    net.forward(x)
    cut = net.backward(up)
    assert np.abs(cut[:, :-1]).max() < 1e-12, "with Whh = 0 only the last step can matter"


def test_hidden_small_recurrent_weights_make_old_gradients_vanish():
    net, r = _rnn(2, 4, 2, 8)
    net.Whh = 0.3 * np.eye(4)
    x, up = r.normal(size=(1, 12, 2)), r.normal(size=(1, 2))
    net.forward(x)
    dx = net.backward(up)
    ratio = np.linalg.norm(dx[0, 0]) / np.linalg.norm(dx[0, -1])
    assert ratio < 1e-4, f"gradient 11 steps back should be tiny, ratio {ratio:.3g}"


def test_hidden_init_is_seeded_and_scaled():
    a, b = RNN(4, 6, 2, seed=3), RNN(4, 6, 2, seed=3)
    assert_close(a.Wxh, b.Wxh)
    assert_close(a.Whh, b.Whh)
    assert_close(a.Why, b.Why)
    big = RNN(50, 400, 3, seed=1)
    assert abs(big.Wxh.std() - 1 / np.sqrt(50)) < 0.01
    assert abs(big.Whh.std() - 1 / np.sqrt(400)) < 0.005
    assert not big.bh.any() and not big.by.any()


def test_hidden_rnn_is_vectorised_over_the_batch():
    from nc_test import python_lines
    net, _ = _rnn(2, 3, 2, 9)
    _, small = python_lines(net.forward, np.zeros((2, 5, 2)))
    _, large = python_lines(net.forward, np.zeros((64, 5, 2)))
    assert large == small, f"forward ran {small} lines for N=2 but {large} for N=64: do not loop over examples"
    net.forward(np.zeros((2, 5, 2)))
    _, bs = python_lines(net.backward, np.zeros((2, 2)))
    net.forward(np.zeros((64, 5, 2)))
    _, bl = python_lines(net.backward, np.zeros((64, 2)))
    assert bl == bs, "backward must not loop over examples"


def _gru(d, h, seed):
    r = np.random.default_rng(seed)
    cell = GRUCell(d, h)
    cell.Wx = r.normal(size=cell.Wx.shape)
    cell.Wh = r.normal(size=cell.Wh.shape)
    cell.b = r.normal(size=3 * h) * 0.5
    return cell, r


def test_hidden_gru_finite_difference_all_inputs():
    for d, h, n, seed in [(2, 3, 4, 1), (3, 2, 1, 2), (1, 4, 3, 3)]:
        cell, r = _gru(d, h, seed)
        x, h0, up = r.normal(size=(n, d)), r.normal(size=(n, h)), r.normal(size=(n, h))
        cell.forward(x, h0)
        dx, dh = cell.backward(up)
        grads = [g.copy() for g in cell.grads()]
        saved = [p.copy() for p in cell.params()]

        def loss(xx=None, hh=None, which=None, val=None):
            for p, s in zip(cell.params(), saved):
                p[...] = s
            if which is not None:
                cell.params()[which][...] = val
            return float((up * cell.forward(x if xx is None else xx, h0 if hh is None else hh)).sum())
        grad_check(lambda v: loss(xx=v), x, dx)
        grad_check(lambda v: loss(hh=v), h0, dh)
        for i, (s, g) in enumerate(zip(saved, grads)):
            grad_check(lambda v, i=i: loss(which=i, val=v), s, g)


def test_hidden_gru_known_values_by_hand():
    cell = GRUCell(1, 1)
    cell.Wx = np.array([[1.0, 2.0, 3.0]])
    cell.Wh = np.array([[0.5, -1.0, 2.0]])
    cell.b = np.array([0.0, 0.0, 0.1])
    x, h = 0.5, 0.4
    z = 1 / (1 + np.exp(-(1.0 * x + 0.5 * h)))
    r = 1 / (1 + np.exp(-(2.0 * x - 1.0 * h)))
    n = np.tanh(3.0 * x + r * (2.0 * h) + 0.1)
    assert_close(cell.forward(np.array([[x]]), np.array([[h]])), [[(1 - z) * n + z * h]])


def test_hidden_gru_update_gate_closed_takes_the_candidate():
    cell = GRUCell(1, 1)
    cell.b = np.array([-50.0, 0.0, 0.0])  # z ~ 0
    cell.Wx = np.array([[0.0, 0.0, 1.5]])
    cell.Wh = np.zeros((1, 3))
    out = cell.forward(np.array([[0.4]]), np.array([[0.9]]))
    assert_close(out, [[np.tanh(0.6)]], atol=1e-6)


def test_hidden_gru_state_gradient_survives_when_update_gate_is_open():
    cell = GRUCell(2, 3, seed=1)
    cell.b = np.array([30.0] * 3 + [0.0] * 6)  # z ~ 1: h' ~ h
    h = np.random.default_rng(0).normal(size=(2, 3))
    cell.forward(np.zeros((2, 2)), h)
    up = np.ones((2, 3))
    _, dh = cell.backward(up)
    assert_close(dh, up, atol=1e-6)


def test_hidden_gru_gradients_are_set_not_accumulated():
    cell, r = _gru(2, 3, 5)
    x, h, up = r.normal(size=(3, 2)), r.normal(size=(3, 3)), r.normal(size=(3, 3))
    cell.forward(x, h)
    cell.backward(up)
    first = [g.copy() for g in cell.grads()]
    cell.forward(x, h)
    cell.backward(up)
    for a, b in zip(first, cell.grads()):
        assert_close(b, a)


def test_hidden_gru_unrolled_chain_matches_finite_differences():
    cell, r = _gru(2, 3, 6)
    xs, up = r.normal(size=(4, 2, 2)), r.normal(size=(2, 3))
    saved = [p.copy() for p in cell.params()]

    def run(xx):
        h = np.zeros((2, 3))
        for t in range(4):
            h = cell.forward(xx[t], h)
        return h
    run(xs)
    dh, dxs = up.copy(), np.zeros_like(xs)
    # re-run with a cache per step so we can walk back
    caches, h = [], np.zeros((2, 3))
    steps = []
    for t in range(4):
        h = cell.forward(xs[t], h)
        steps.append(cell._cache)
    dWx = np.zeros_like(cell.Wx)
    for t in range(3, -1, -1):
        cell._cache = steps[t]
        dx, dh = cell.backward(dh)
        dxs[t] = dx
        dWx += cell.dWx
    grad_check(lambda v: float((up * run(v)).sum()), xs, dxs)
    for p, s in zip(cell.params(), saved):
        p[...] = s
    grad_check(lambda W: (cell.Wx.__setitem__(Ellipsis, W), float((up * run(xs)).sum()))[1], saved[0], dWx)
