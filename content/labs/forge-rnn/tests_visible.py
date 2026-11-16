import numpy as np
from nc_test import assert_close


def test_rnn_output_shape_and_gradient_shapes():
    m = RNN(3, 5, 2)
    x = np.ones((4, 6, 3))
    out = m.forward(x)
    assert out.shape == (4, 2)
    dx = m.backward(np.ones((4, 2)))
    assert dx.shape == x.shape
    for p, g in zip(m.params(), m.grads()):
        assert p.shape == g.shape


def test_rnn_single_step_by_hand():
    m = RNN(1, 1, 1)
    m.Wx, m.Wh, m.bh = np.array([[2.0]]), np.array([[9.0]]), np.zeros(1)
    m.Wy, m.by = np.array([[1.0]]), np.zeros(1)
    # h_0 = 0, so the recurrent weight does not matter for the first step: tanh(2 * 0.5) = tanh(1)
    assert_close(m.forward(np.array([[[0.5]]])), [[np.tanh(1.0)]])


def test_rnn_dh_norms_has_one_entry_per_step():
    m = RNN(2, 3, 2)
    m.forward(np.ones((1, 7, 2)))
    m.backward(np.ones((1, 2)))
    assert len(m.dh_norms) == 7


def test_gru_output_shape_and_gradient_shapes():
    g = GRUCell(3, 4)
    h = g.forward(np.ones((2, 3)), np.zeros((2, 4)))
    assert h.shape == (2, 4)
    dx, dh = g.backward(np.ones((2, 4)))
    assert dx.shape == (2, 3) and dh.shape == (2, 4)
    for p, d in zip(g.params(), g.grads()):
        assert p.shape == d.shape


def test_gru_update_gate_open_keeps_the_old_state():
    g = GRUCell(2, 3)
    g.bz = np.full(3, 40.0)  # z = sigmoid(40) is 1 to machine precision
    h = np.array([[0.3, -0.5, 0.8]])
    assert_close(g.forward(np.ones((1, 2)), h), h, atol=1e-9)
