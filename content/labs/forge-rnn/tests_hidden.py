import numpy as np
from nc_test import assert_close, grad_check


def _rnn(D, H, seed):
    r = np.random.default_rng(seed)
    rnn = RNN(D, H)
    rnn.Wxh = r.normal(size=rnn.Wxh.shape)
    rnn.Whh = r.normal(size=rnn.Whh.shape) * 0.7
    rnn.bh = r.normal(size=H) * 0.3
    return rnn, r


def _check_rnn(rnn, xs, upstream):
    """Objective L = sum(upstream * hs); compare dxs, dWxh, dWhh, dbh with central differences."""
    rnn.forward(xs)
    dxs = rnn.backward(upstream)
    dW, dU, db = rnn.dWxh.copy(), rnn.dWhh.copy(), rnn.dbh.copy()
    W0, U0, b0 = rnn.Wxh.copy(), rnn.Whh.copy(), rnn.bh.copy()
    assert dxs.shape == xs.shape, f"dxs shape {dxs.shape} != {xs.shape}"

    def L(x=None, W=None, U=None, b=None):
        keep = (rnn.Wxh, rnn.Whh, rnn.bh)
        rnn.Wxh = W0 if W is None else W
        rnn.Whh = U0 if U is None else U
        rnn.bh = b0 if b is None else b
        out = float((upstream * rnn.forward(xs if x is None else x)).sum())
        rnn.Wxh, rnn.Whh, rnn.bh = keep
        return out
    grad_check(lambda x: L(x=x), xs, dxs)
    grad_check(lambda W: L(W=W), W0, dW)
    grad_check(lambda U: L(U=U), U0, dU)
    grad_check(lambda b: L(b=b), b0, db)


def test_hidden_rnn_finite_difference_every_step_has_loss():
    rnn, r = _rnn(3, 4, 1)
    xs = r.normal(size=(2, 6, 3))
    _check_rnn(rnn, xs, r.normal(size=(2, 6, 4)))


def test_hidden_rnn_finite_difference_loss_only_on_last_step():
    rnn, r = _rnn(2, 5, 2)
    xs = r.normal(size=(3, 9, 2))
    up = np.zeros((3, 9, 5))
    up[:, -1] = r.normal(size=(3, 5))  # many-to-one: the gradient must travel back through all 9 steps
    _check_rnn(rnn, xs, up)


def test_hidden_rnn_finite_difference_single_step_and_single_example():
    rnn, r = _rnn(4, 3, 3)
    _check_rnn(rnn, r.normal(size=(1, 1, 4)), r.normal(size=(1, 1, 3)))
    rnn, r = _rnn(1, 2, 4)
    _check_rnn(rnn, r.normal(size=(1, 7, 1)), r.normal(size=(1, 7, 2)))


def test_hidden_rnn_known_values_by_hand():
    rnn = RNN(1, 1)
    rnn.Wxh, rnn.Whh, rnn.bh = np.array([[1.0]]), np.array([[0.5]]), np.array([0.0])
    hs = rnn.forward(np.array([[[1.0], [0.0]]]))
    h1 = np.tanh(1.0)
    assert_close(hs[0, :, 0], [h1, np.tanh(0.5 * h1)])


def test_hidden_rnn_uses_previous_state_not_current_for_recurrent_gradient():
    rnn = RNN(1, 1)
    rnn.Wxh, rnn.Whh, rnn.bh = np.array([[1.0]]), np.array([[0.5]]), np.array([0.0])
    hs = rnn.forward(np.array([[[1.0], [0.0]]]))
    rnn.backward(np.array([[[0.0], [1.0]]]))
    h1, h2 = hs[0, 0, 0], hs[0, 1, 0]
    # Only step 2 has loss: dh2 = 1; da2 = 1 - h2^2; dWhh = h1 * da2 (h_{t-1}, never h_t)
    assert_close(rnn.dWhh, [[h1 * (1 - h2 ** 2)]])


def test_hidden_rnn_gradient_reaches_early_inputs_only_through_the_recurrence():
    rnn, r = _rnn(2, 3, 5)
    xs = r.normal(size=(1, 4, 2))
    up = np.zeros((1, 4, 3))
    up[:, -1] = 1.0
    rnn.forward(xs)
    assert np.abs(rnn.backward(up)[:, 0]).sum() > 0, "early inputs must receive gradient from the last step"
    rnn.Whh = np.zeros_like(rnn.Whh)
    rnn.forward(xs)
    dxs = rnn.backward(up)
    assert_close(dxs[:, :-1], np.zeros((1, 3, 2)), msg="with Whh = 0 nothing flows back in time")


def test_hidden_rnn_is_stateless_between_calls_and_grads_are_set_not_accumulated():
    rnn, r = _rnn(2, 3, 6)
    xs = r.normal(size=(2, 5, 2))
    first = rnn.forward(xs).copy()
    assert_close(rnn.forward(xs), first, msg="every forward must start from h_0 = 0")
    up = r.normal(size=(2, 5, 3))
    rnn.backward(up)
    once = [g.copy() for g in rnn.grads()]
    rnn.forward(xs)
    rnn.backward(up)
    for a, b in zip(once, rnn.grads()):
        assert_close(b, a, msg="backward must set the gradients, not add to the previous ones")


def test_hidden_rnn_gradient_vanishes_with_small_recurrent_weights_and_survives_with_large():
    def reach(scale):
        rnn = RNN(1, 8, seed=7)
        rnn.Whh = np.eye(8) * scale
        xs = np.zeros((1, 30, 1))
        up = np.zeros((1, 30, 8))
        up[:, -1] = 1.0
        rnn.forward(xs)
        rnn.backward(up)
        return rnn.dbh  # dbh sums da over all steps; the first steps contribute only if the gradient survived
    small, large = np.linalg.norm(reach(0.5)), np.linalg.norm(reach(1.0))
    assert small < 0.2 * large, f"identity recurrence should keep far more gradient ({small:.2f} vs {large:.2f})"


def test_hidden_rnn_init_scales_and_draw_order():
    rnn = RNN(16, 64, seed=3)
    rng = np.random.default_rng(3)
    assert_close(rnn.Wxh, rng.normal(size=(16, 64)) / np.sqrt(16), msg="Wxh is drawn first")
    assert_close(rnn.Whh, rng.normal(size=(64, 64)) / np.sqrt(64), msg="Whh is drawn second")
    assert_close(rnn.bh, np.zeros(64))


def _gru(D, H, seed):
    r = np.random.default_rng(seed)
    cell = GRUCell(D, H)
    cell.Wx = r.normal(size=cell.Wx.shape)
    cell.Wh = r.normal(size=cell.Wh.shape) * 0.8
    cell.b = r.normal(size=cell.b.shape) * 0.3
    return cell, r


def test_hidden_gru_finite_difference_all_inputs():
    cell, r = _gru(3, 4, 1)
    x, h = r.normal(size=(3, 3)), r.normal(size=(3, 4))
    up = r.normal(size=(3, 4))
    cell.forward(x, h)
    dx, dh = cell.backward(up)
    dWx, dWh, db = cell.dWx.copy(), cell.dWh.copy(), cell.db.copy()
    Wx0, Wh0, b0 = cell.Wx.copy(), cell.Wh.copy(), cell.b.copy()

    def L(x_=None, h_=None, Wx=None, Wh=None, b=None):
        keep = (cell.Wx, cell.Wh, cell.b)
        cell.Wx = Wx0 if Wx is None else Wx
        cell.Wh = Wh0 if Wh is None else Wh
        cell.b = b0 if b is None else b
        out = float((up * cell.forward(x if x_ is None else x_, h if h_ is None else h_)).sum())
        cell.Wx, cell.Wh, cell.b = keep
        return out
    grad_check(lambda v: L(x_=v), x, dx)
    grad_check(lambda v: L(h_=v), h, dh)
    grad_check(lambda v: L(Wx=v), Wx0, dWx)
    grad_check(lambda v: L(Wh=v), Wh0, dWh)
    grad_check(lambda v: L(b=v), b0, db)


def test_hidden_gru_known_value_update_gate_direction():
    cell = GRUCell(1, 1)
    cell.Wx, cell.Wh, cell.b = np.zeros((1, 3)), np.zeros((1, 3)), np.zeros(3)
    cell.b[0] = 40.0   # z ~ 1: keep the old state
    cell.b[2] = 0.5
    assert_close(cell.forward(np.zeros((1, 1)), np.array([[0.9]])), [[0.9]], atol=1e-6)


def test_hidden_gru_reset_gate_scales_the_recurrent_part_after_the_matmul():
    cell = GRUCell(1, 2)
    cell.Wx, cell.b = np.zeros((1, 6)), np.zeros(6)
    cell.Wh = np.zeros((2, 6))
    cell.Wh[:, 4:] = [[1.0, 2.0], [3.0, 4.0]]   # h @ Wh_n
    cell.b[0:2] = -40.0                          # z ~ 0
    cell.b[2:4] = 0.0                            # r = 0.5
    h = np.array([[1.0, 1.0]])
    expected = np.tanh(0.5 * (h @ np.array([[1.0, 2.0], [3.0, 4.0]])))
    assert_close(cell.forward(np.zeros((1, 1)), h), expected, atol=1e-6)


def test_hidden_gru_highway_keeps_gradient_alive_when_update_gate_is_closed():
    cell = GRUCell(2, 6, seed=5)
    cell.b[:6] = 6.0   # z ~ 0.9975: almost copy the state
    dh_up = np.ones((1, 6))
    for _ in range(50):  # push the gradient back through 50 steps
        cell.forward(np.zeros((1, 2)), np.zeros((1, 6)))
        _, d = cell.backward(dh_up)
        dh_up = d
    assert np.linalg.norm(dh_up) > 0.5 * np.linalg.norm(np.ones(6)), "the z * dh path should preserve gradient"


def test_hidden_gru_grads_are_set_not_accumulated():
    cell, r = _gru(2, 3, 9)
    x, h, up = r.normal(size=(2, 2)), r.normal(size=(2, 3)), r.normal(size=(2, 3))
    cell.forward(x, h)
    cell.backward(up)
    once = [g.copy() for g in cell.grads()]
    cell.forward(x, h)
    cell.backward(up)
    for a, b in zip(once, cell.grads()):
        assert_close(b, a)
