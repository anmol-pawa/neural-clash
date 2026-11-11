import numpy as np
from nc_test import assert_close


def test_dropout_eval_is_identity():
    d = Dropout(0.5)
    d.eval()
    x = np.arange(6.0).reshape(2, 3)
    assert_close(d.forward(x), x)


def test_sgd_plain_step():
    p = np.array([1.0, 2.0])
    SGD([p], lr=0.5).step([np.array([1.0, -1.0])])
    assert_close(p, [0.5, 2.5])


def test_adamw_first_step_is_about_lr():
    p = np.array([1.0])
    AdamW([p], lr=0.01, weight_decay=0.0).step([np.array([5.0])])
    assert_close(p, [0.99], atol=1e-6)
