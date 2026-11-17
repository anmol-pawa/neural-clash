import numpy as np
from nc_test import assert_close


def test_rnn_state_shape_and_first_step():
    rnn = RNN(3, 4, seed=1)
    xs = np.random.default_rng(0).normal(size=(2, 5, 3))
    hs = rnn.forward(xs)
    assert hs.shape == (2, 5, 4)
    assert_close(hs[:, 0], np.tanh(xs[:, 0] @ rnn.Wxh + rnn.bh))  # h_0 is zero, so Whh does not matter yet


def test_rnn_gradient_shapes_match_inputs_and_parameters():
    rnn = RNN(3, 4)
    xs = np.ones((2, 5, 3))
    hs = rnn.forward(xs)
    dxs = rnn.backward(np.ones_like(hs))
    assert dxs.shape == xs.shape
    assert rnn.dWxh.shape == rnn.Wxh.shape and rnn.dWhh.shape == rnn.Whh.shape and rnn.dbh.shape == rnn.bh.shape


def test_gru_zero_update_gate_takes_the_candidate():
    cell = GRUCell(2, 3)
    cell.Wx = np.zeros_like(cell.Wx)
    cell.Wh = np.zeros_like(cell.Wh)
    cell.b = np.zeros_like(cell.b)
    cell.b[:3] = -40.0  # z ~ 0: forget the old state, take the candidate
    cell.b[6:] = 0.5    # n = tanh(0.5)
    h = cell.forward(np.zeros((1, 2)), np.full((1, 3), 0.9))
    assert_close(h, np.full((1, 3), np.tanh(0.5)), atol=1e-6)


def test_gru_gradient_shapes():
    cell = GRUCell(2, 3)
    h = cell.forward(np.ones((4, 2)), np.zeros((4, 3)))
    dx, dh = cell.backward(np.ones_like(h))
    assert dx.shape == (4, 2) and dh.shape == (4, 3)
    assert cell.dWx.shape == cell.Wx.shape and cell.dWh.shape == cell.Wh.shape and cell.db.shape == cell.b.shape
