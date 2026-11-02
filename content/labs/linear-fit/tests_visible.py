import numpy as np
from nc_test import assert_close


def test_recovers_a_noiseless_line():
    X = np.array([[0.0], [1.0], [2.0], [3.0]])
    y = 2.0 * X[:, 0] + 1.0
    w, b, losses = fit_linear(X, y, lr=0.1, epochs=2000)
    assert_close(w, [2.0], atol=1e-2)
    assert_close(b, 1.0, atol=1e-2)
    assert len(losses) == 2000


def test_perfect_model_scores_r2_of_one():
    X = np.array([[1.0], [2.0], [3.0]])
    m = evaluate(np.array([2.0]), 0.0, X, np.array([2.0, 4.0, 6.0]))
    assert_close(m["r2"], 1.0)
    assert_close(m["mse"], 0.0)
