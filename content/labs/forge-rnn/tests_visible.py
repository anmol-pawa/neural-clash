import numpy as np
from nc_test import assert_close


def test_rnn_logits_shape():
    rnn = RNN(3, 5, 2)
    assert rnn.forward(np.ones((4, 6, 3))).shape == (4, 2)


def test_rnn_single_step_matches_the_formula():
    rnn = RNN(1, 1, 1)
    rnn.Wxh, rnn.Whh, rnn.bh = np.array([[2.0]]), np.array([[0.5]]), np.array([0.1])
    rnn.Why, rnn.by = np.array([[3.0]]), np.array([1.0])
    out = rnn.forward(np.array([[[0.5]]]))
    assert_close(out, [[3.0 * np.tanh(2.0 * 0.5 + 0.1) + 1.0]])


def test_rnn_gradient_shapes_match_parameters_and_input():
    rnn = RNN(2, 4, 3)
    x = np.ones((5, 7, 2))
    dx = rnn.backward(np.ones_like(rnn.forward(x)))
    assert dx.shape == x.shape
    for p, g in zip(rnn.params(), rnn.grads()):
        assert p.shape == g.shape


def test_gru_output_shape_and_gradient_shapes():
    cell = GRUCell(3, 4)
    h = cell.forward(np.ones((2, 3)), np.zeros((2, 4)))
    assert h.shape == (2, 4)
    dx, dh = cell.backward(np.ones((2, 4)))
    assert dx.shape == (2, 3) and dh.shape == (2, 4)


def test_gru_update_gate_fully_open_keeps_the_old_state():
    cell = GRUCell(1, 2)
    cell.b = np.array([50.0, 50.0, 0, 0, 0, 0])  # z ~ 1
    h = np.array([[0.3, -0.7]])
    assert_close(cell.forward(np.array([[1.0]]), h), h, atol=1e-6)
