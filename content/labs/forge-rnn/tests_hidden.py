import numpy as np
from nc_test import assert_close, grad_check, python_lines

RNN_NAMES = ["Wx", "Wh", "bh", "Wy", "by"]
GRU_NAMES = ["Wz", "Uz", "bz", "Wr", "Ur", "br", "Wn", "Un", "bn"]


def _rnn(D, H, C, seed):
    r = np.random.default_rng(seed)
    m = RNN(D, H, C)
    for name in RNN_NAMES:
        setattr(m, name, r.normal(size=getattr(m, name).shape) * 0.7)
    return m, r


def _check_rnn(m, x, up):
    """Objective L = sum(up * logits); compare every gradient with central differences."""
    m.forward(x)
    dx = m.backward(up)
    grads = [g.copy() for g in m.grads()]
    assert dx.shape == x.shape, f"dx shape {dx.shape} != {x.shape}"
    start = {n: getattr(m, n).copy() for n in RNN_NAMES}

    def L(x_=None, name=None, value=None):
        for n in RNN_NAMES:
            setattr(m, n, (value if n == name else start[n]).copy())
        return float((up * m.forward(x if x_ is None else x_)).sum())
    grad_check(lambda v: L(x_=v), x, dx)
    for n, g in zip(RNN_NAMES, grads):
        grad_check(lambda v, n=n: L(name=n, value=v), start[n], g)
    for n in RNN_NAMES:
        setattr(m, n, start[n])


def test_hidden_rnn_finite_differences_every_parameter():
    m, r = _rnn(3, 4, 2, 1)
    _check_rnn(m, r.normal(size=(2, 5, 3)), r.normal(size=(2, 2)))


def test_hidden_rnn_finite_differences_long_sequence_and_odd_shapes():
    m, r = _rnn(2, 3, 3, 2)
    _check_rnn(m, r.normal(size=(1, 12, 2)), r.normal(size=(1, 3)))
    m, r = _rnn(4, 2, 1, 3)  # a single step: no recurrence at all
    _check_rnn(m, r.normal(size=(3, 1, 4)), r.normal(size=(3, 1)))


def test_hidden_rnn_forward_by_hand():
    m = RNN(1, 1, 1)
    m.Wx, m.Wh, m.bh = np.array([[1.0]]), np.array([[0.5]]), np.array([0.1])
    m.Wy, m.by = np.array([[2.0]]), np.array([-1.0])
    h1 = np.tanh(1.0 * 1.0 + 0.1)
    h2 = np.tanh(1.0 * -1.0 + 0.5 * h1 + 0.1)
    assert_close(m.forward(np.array([[[1.0], [-1.0]]])), [[2.0 * h2 - 1.0]])


def test_hidden_rnn_state_does_not_leak_between_calls():
    m, r = _rnn(2, 3, 2, 4)
    x = r.normal(size=(2, 4, 2))
    first = m.forward(x).copy()
    other = r.normal(size=(2, 4, 2))
    m.forward(other)
    assert_close(m.forward(x), first)


def test_hidden_rnn_gradients_are_set_not_accumulated():
    m, r = _rnn(2, 3, 2, 5)
    x, up = r.normal(size=(2, 4, 2)), r.normal(size=(2, 2))
    m.forward(x)
    m.backward(up)
    first = [g.copy() for g in m.grads()]
    m.forward(x)
    m.backward(up)
    for a, b in zip(first, m.grads()):
        assert_close(b, a)


def test_hidden_rnn_gradient_norm_shrinks_by_the_recurrent_gain_each_step():
    # With zero input and bias every state is 0, where tanh' = 1, so dL/dh_t = Wh^T dL/dh_{t+1}.
    for gain in (0.5, 1.5):
        m = RNN(2, 3, 2)
        m.Wx, m.bh = np.zeros((2, 3)), np.zeros(3)
        m.Wh = gain * np.eye(3)
        m.Wy = np.array([[1.0, 0.0], [0.0, 2.0], [2.0, 0.0]])
        m.forward(np.zeros((1, 6, 2)))
        m.backward(np.array([[1.0, 1.0]]))
        top = np.linalg.norm(np.array([1.0, 2.0, 2.0]))  # ||dlogits @ Wy.T||
        assert len(m.dh_norms) == 6
        assert_close(m.dh_norms, [top * gain ** (5 - t) for t in range(6)])


def test_hidden_rnn_weights_are_shared_so_dWh_adds_over_time():
    m = RNN(1, 1, 1)
    m.Wx, m.Wh, m.bh = np.array([[1.0]]), np.array([[0.0]]), np.zeros(1)
    m.Wy, m.by = np.array([[1.0]]), np.zeros(1)
    x = np.array([[[1.0], [1.0], [1.0]]])
    m.forward(x)
    m.backward(np.array([[1.0]]))
    h = np.tanh(1.0)  # Wh = 0: every state is tanh(1)
    # dL/dh_3 = 1; each state feeds the next only through Wh = 0, so only step 3 contributes to dL/dh_t.
    # dWh = sum_t h_{t-1} * da_t with da_3 = 1 - h^2 and da_1 = da_2 = 0.
    assert_close(m.dWh, [[h * (1 - h ** 2)]])


def test_hidden_rnn_init_is_seeded_and_scaled():
    D, H, C = 50, 200, 3
    m = RNN(D, H, C, seed=7)
    r = np.random.default_rng(7)
    assert_close(m.Wx, r.normal(size=(D, H)) / np.sqrt(D))
    assert_close(m.Wh, r.normal(size=(H, H)) / np.sqrt(H))
    assert_close(m.Wy, r.normal(size=(H, C)) / np.sqrt(H))
    assert not np.any(m.bh) and not np.any(m.by)
    assert abs(m.Wh.std() - 1 / np.sqrt(H)) < 0.01


def test_hidden_rnn_is_vectorised_over_the_batch():
    m, r = _rnn(3, 4, 2, 6)
    _, small = python_lines(m.forward, r.normal(size=(2, 5, 3)))
    _, big = python_lines(m.forward, r.normal(size=(64, 5, 3)))
    assert big == small, "forward must loop over time only, never over examples"
    m.forward(r.normal(size=(2, 5, 3)))
    _, small_b = python_lines(m.backward, r.normal(size=(2, 2)))
    m.forward(r.normal(size=(64, 5, 3)))
    _, big_b = python_lines(m.backward, r.normal(size=(64, 2)))
    assert big_b == small_b


def test_hidden_rnn_small_gradient_step_lowers_the_loss():
    m, r = _rnn(3, 4, 2, 8)
    x, up = r.normal(size=(4, 6, 3)), r.normal(size=(4, 2))
    before = float((up * m.forward(x)).sum())
    m.backward(up)
    for p, g in zip(m.params(), m.grads()):
        p -= 1e-3 * g
    assert float((up * m.forward(x)).sum()) < before


def _gru(D, H, seed):
    r = np.random.default_rng(seed)
    g = GRUCell(D, H)
    for name in GRU_NAMES:
        setattr(g, name, r.normal(size=getattr(g, name).shape) * 0.8)
    return g, r


def test_hidden_gru_finite_differences_every_parameter():
    g, r = _gru(3, 4, 11)
    x, h, up = r.normal(size=(3, 3)), r.normal(size=(3, 4)), r.normal(size=(3, 4))
    g.forward(x, h)
    dx, dh = g.backward(up)
    grads = [d.copy() for d in g.grads()]
    assert dx.shape == x.shape and dh.shape == h.shape
    start = {n: getattr(g, n).copy() for n in GRU_NAMES}

    def L(x_=None, h_=None, name=None, value=None):
        for n in GRU_NAMES:
            setattr(g, n, (value if n == name else start[n]).copy())
        return float((up * g.forward(x if x_ is None else x_, h if h_ is None else h_)).sum())
    grad_check(lambda v: L(x_=v), x, dx)
    grad_check(lambda v: L(h_=v), h, dh)
    for n, d in zip(GRU_NAMES, grads):
        grad_check(lambda v, n=n: L(name=n, value=v), start[n], d)


def test_hidden_gru_forward_by_hand_with_two_hidden_units():
    g = GRUCell(1, 2)
    g.Wz, g.Uz, g.bz = np.array([[0.5, -0.5]]), np.array([[1.0, 0.0], [0.0, 1.0]]), np.zeros(2)
    g.Wr, g.Ur, g.br = np.array([[1.0, 1.0]]), np.zeros((2, 2)), np.zeros(2)
    g.Wn, g.Un, g.bn = np.array([[1.0, 0.0]]), np.array([[1.0, 2.0], [0.0, 1.0]]), np.zeros(2)
    x, h = np.array([[1.0]]), np.array([[0.4, -0.2]])
    z = 1 / (1 + np.exp(-np.array([0.5 + 0.4, -0.5 - 0.2])))
    r = 1 / (1 + np.exp(-np.array([1.0, 1.0])))
    rh = r * h[0]  # the reset gate is applied to h BEFORE the Un matmul
    n = np.tanh(np.array([1.0 + rh[0] * 1.0 + rh[1] * 0.0, 0.0 + rh[0] * 2.0 + rh[1] * 1.0]))
    assert_close(g.forward(x, h), [(1 - z) * n + z * h[0]])


def test_hidden_gru_update_gate_closed_ignores_the_old_state():
    g, r = _gru(2, 3, 12)
    g.bz = np.full(3, -40.0)  # z = 0 to machine precision
    g.Un = np.zeros((3, 3))  # candidate does not read h either
    x = r.normal(size=(2, 2))
    a = g.forward(x, r.normal(size=(2, 3)))
    b = g.forward(x, r.normal(size=(2, 3)))
    assert_close(a, b, atol=1e-8)
    assert_close(a, np.tanh(x @ g.Wn + g.bn), atol=1e-8)


def test_hidden_gru_update_gate_open_passes_gradient_straight_through():
    g, r = _gru(2, 3, 13)
    g.bz = np.full(3, 40.0)
    h, up = r.normal(size=(2, 3)), r.normal(size=(2, 3))
    g.forward(r.normal(size=(2, 2)), h)
    dx, dh = g.backward(up)
    assert_close(dh, up, atol=1e-8)  # the identity path: this is how a GRU keeps long-range gradient
    assert_close(dx, np.zeros_like(dx), atol=1e-8)


def test_hidden_gru_gradients_are_set_not_accumulated():
    g, r = _gru(2, 3, 14)
    x, h, up = r.normal(size=(2, 2)), r.normal(size=(2, 3)), r.normal(size=(2, 3))
    g.forward(x, h)
    g.backward(up)
    first = [d.copy() for d in g.grads()]
    g.forward(x, h)
    g.backward(up)
    for a, b in zip(first, g.grads()):
        assert_close(b, a)


def test_hidden_gru_init_is_seeded_and_scaled():
    g = GRUCell(5, 7, seed=3)
    r = np.random.default_rng(3)
    for name, rows in [("Wz", 5), ("Uz", 7), ("Wr", 5), ("Ur", 7), ("Wn", 5), ("Un", 7)]:
        assert_close(getattr(g, name), r.normal(size=(rows, 7)) / np.sqrt(rows), msg=name)
    assert not any(np.any(b) for b in (g.bz, g.br, g.bn))


def test_hidden_gru_survives_extreme_pre_activations():
    g, r = _gru(2, 3, 15)
    g.bz, g.br = np.full(3, -1000.0), np.full(3, 1000.0)
    with np.errstate(over="raise", invalid="raise", divide="raise"):
        out = g.forward(r.normal(size=(2, 2)), r.normal(size=(2, 3)))
        g.backward(np.ones((2, 3)))
    assert np.all(np.isfinite(out))
