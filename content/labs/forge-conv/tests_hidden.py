import numpy as np
from nc_test import assert_close, grad_check


def _conv(in_ch, out_ch, k, stride, pad, seed):
    r = np.random.default_rng(seed)
    conv = Conv2D(in_ch, out_ch, k, stride=stride, pad=pad)
    conv.W = r.normal(size=conv.W.shape)
    conv.b = r.normal(size=out_ch)
    return conv, r


def _check_conv(conv, x, upstream):
    """Objective L = sum(upstream * conv(x)); compare dx, dW, db with central differences."""
    conv.forward(x)
    dx = conv.backward(upstream)
    dW, db = conv.dW.copy(), conv.db.copy()
    W0, b0 = conv.W.copy(), conv.b.copy()
    assert dx.shape == x.shape, f"dx shape {dx.shape} != {x.shape}"

    def L(xx=None, W=None, b=None):
        keep = (conv.W, conv.b)
        conv.W = W0 if W is None else W
        conv.b = b0 if b is None else b
        out = float((upstream * conv.forward(x if xx is None else xx)).sum())
        conv.W, conv.b = keep
        return out
    grad_check(lambda xx: L(xx=xx), x, dx)
    grad_check(lambda W: L(W=W), W0, dW)
    grad_check(lambda b: L(b=b), b0, db)


def test_hidden_finite_difference_plain():
    conv, r = _conv(2, 3, 3, 1, 0, 1)
    x = r.normal(size=(2, 2, 6, 6))
    _check_conv(conv, x, r.normal(size=(2, 3, 4, 4)))


def test_hidden_finite_difference_padding_and_stride():
    conv, r = _conv(2, 2, 3, 2, 1, 2)
    x = r.normal(size=(2, 2, 7, 7))
    _check_conv(conv, x, r.normal(size=(2, 2, 4, 4)))


def test_hidden_finite_difference_non_square_and_1x1():
    conv, r = _conv(3, 2, 1, 1, 0, 3)
    x = r.normal(size=(2, 3, 4, 5))
    _check_conv(conv, x, r.normal(size=(2, 2, 4, 5)))
    conv, r = _conv(1, 2, 2, 1, 1, 4)
    x = r.normal(size=(1, 1, 3, 5))
    _check_conv(conv, x, r.normal(size=(1, 2, 4, 6)))


def test_hidden_known_values_by_hand():
    conv = Conv2D(1, 1, 2)
    conv.W = np.array([[[[1.0, 2.0], [3.0, 4.0]]]])
    conv.b = np.array([0.5])
    x = np.array([[[[1.0, 0.0, 2.0], [0.0, 1.0, 0.0], [3.0, 0.0, 1.0]]]])
    # Cross-correlation (no kernel flip): out[0,0] = 1*1 + 0*2 + 0*3 + 1*4 + 0.5
    assert_close(conv.forward(x), [[[[5.5, 7.5], [11.5, 5.5]]]])


def test_hidden_cross_correlation_not_convolution():
    conv = Conv2D(1, 1, 2)
    conv.W = np.array([[[[1.0, 0.0], [0.0, 0.0]]]])
    conv.b = np.zeros(1)
    x = np.arange(9.0).reshape(1, 1, 3, 3)
    assert_close(conv.forward(x), [[[[0.0, 1.0], [3.0, 4.0]]]])


def test_hidden_batch_and_channel_sums():
    conv = Conv2D(2, 1, 1)
    conv.W = np.ones((1, 2, 1, 1))
    conv.b = np.zeros(1)
    x = np.stack([np.ones((2, 2, 2)), 2 * np.ones((2, 2, 2))])
    assert_close(conv.forward(x)[:, 0, 0, 0], [2.0, 4.0])
    conv.backward(np.ones((2, 1, 2, 2)))
    assert_close(conv.db, [8.0])  # summed over the batch and every spatial position
    assert_close(conv.dW.reshape(-1), [12.0, 12.0])  # not averaged over the batch


def test_hidden_gradients_are_set_not_accumulated():
    conv, r = _conv(1, 2, 3, 1, 1, 5)
    x, d = r.normal(size=(2, 1, 5, 5)), r.normal(size=(2, 2, 5, 5))
    conv.forward(x)
    conv.backward(d)
    dW, db = conv.dW.copy(), conv.db.copy()
    conv.forward(x)
    conv.backward(d)
    assert_close(conv.dW, dW)
    assert_close(conv.db, db)


def test_hidden_input_gradient_adds_up_over_overlapping_windows():
    conv = Conv2D(1, 1, 3)
    conv.W = np.ones((1, 1, 3, 3))
    conv.b = np.zeros(1)
    conv.forward(np.zeros((1, 1, 5, 5)))
    dx = conv.backward(np.ones((1, 1, 3, 3)))
    # The centre pixel is read by all 9 windows, a corner by exactly one.
    assert dx[0, 0, 2, 2] == 9.0 and dx[0, 0, 0, 0] == 1.0 and dx[0, 0, 0, 2] == 3.0


def test_hidden_shape_matches_formula_for_awkward_sizes():
    for size, k, s, p in [(7, 3, 2, 0), (8, 3, 2, 1), (9, 5, 3, 2), (5, 5, 1, 0)]:
        conv = Conv2D(1, 1, k, stride=s, pad=p)
        want = (size + 2 * p - k) // s + 1
        assert conv.forward(np.zeros((1, 1, size, size))).shape == (1, 1, want, want)


def test_hidden_init_is_seeded_and_scaled():
    a, b = Conv2D(4, 16, 3, seed=7), Conv2D(4, 16, 3, seed=7)
    assert_close(a.W, b.W)
    assert a.W.shape == (16, 4, 3, 3)
    assert abs(a.W.std() - 1 / np.sqrt(4 * 3 * 3)) < 0.03
    assert not np.any(a.b)


def test_hidden_forward_is_vectorised_over_pixels():
    from nc_test import python_lines
    conv = Conv2D(1, 2, 3)
    _, small = python_lines(conv.forward, np.zeros((1, 1, 6, 6)))
    _, large = python_lines(conv.forward, np.zeros((1, 1, 24, 24)))
    assert large < small * 3, f"forward executed {large} lines on a 24x24 image vs {small} on 6x6: loop over kernel offsets, not pixels"


def test_hidden_maxpool_finite_difference():
    r = np.random.default_rng(11)
    pool = MaxPool2D(2)
    x = r.normal(size=(2, 3, 6, 6))
    up = r.normal(size=(2, 3, 3, 3))
    pool.forward(x)
    dx = pool.backward(up)
    grad_check(lambda xx: float((up * MaxPool2D(2).forward(xx)).sum()), x, dx)


def test_hidden_maxpool_overlapping_windows_accumulate():
    r = np.random.default_rng(12)
    x = r.normal(size=(1, 2, 7, 7))
    pool = MaxPool2D(3, stride=2)
    out = pool.forward(x)
    assert out.shape == (1, 2, 3, 3)
    up = r.normal(size=out.shape)
    dx = pool.backward(up)
    grad_check(lambda xx: float((up * MaxPool2D(3, stride=2).forward(xx)).sum()), x, dx)
    assert_close(dx.sum(), up.sum())  # gradient mass is conserved


def test_hidden_maxpool_drops_incomplete_windows():
    pool = MaxPool2D(2)
    x = np.arange(25.0).reshape(1, 1, 5, 5)
    assert_close(pool.forward(x), [[[[6.0, 8.0], [16.0, 18.0]]]])
    dx = pool.backward(np.ones((1, 1, 2, 2)))
    assert dx.shape == x.shape and dx.sum() == 4.0 and dx[0, 0, 4, 4] == 0.0


def test_hidden_maxpool_ties_send_gradient_to_exactly_one_input():
    pool = MaxPool2D(2)
    pool.forward(np.ones((1, 1, 2, 2)))
    dx = pool.backward(np.array([[[[1.0]]]]))
    assert dx.sum() == 1.0 and np.count_nonzero(dx) == 1
    assert dx[0, 0, 0, 0] == 1.0  # first maximum in row-major order


def test_hidden_maxpool_uses_each_channel_and_example_separately():
    x = np.zeros((2, 2, 2, 2))
    x[0, 0, 0, 1] = 5
    x[0, 1, 1, 0] = 7
    x[1, 0, 1, 1] = 3
    x[1, 1, 0, 0] = 2
    pool = MaxPool2D(2)
    assert_close(pool.forward(x).reshape(-1), [5, 7, 3, 2])
    dx = pool.backward(np.ones((2, 2, 1, 1)))
    assert dx[0, 0, 0, 1] == 1 and dx[0, 1, 1, 0] == 1 and dx[1, 0, 1, 1] == 1 and dx[1, 1, 0, 0] == 1
    assert dx.sum() == 4


def test_hidden_conv_then_pool_chain_rule():
    r = np.random.default_rng(13)
    conv, _ = _conv(1, 2, 3, 1, 0, 14)
    pool = MaxPool2D(2)
    x = r.normal(size=(2, 1, 6, 6))
    up = r.normal(size=(2, 2, 2, 2))
    pool.forward(conv.forward(x))
    dx = conv.backward(pool.backward(up))
    W0, b0 = conv.W.copy(), conv.b.copy()

    def L(xx):
        c = Conv2D(1, 2, 3)
        c.W, c.b = W0, b0
        return float((up * MaxPool2D(2).forward(c.forward(xx))).sum())
    grad_check(L, x, dx)
