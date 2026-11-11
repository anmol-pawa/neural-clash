import numpy as np
from nc_test import assert_close, grad_check


def test_hidden_std_formulas():
    assert_close(he_std(200), np.sqrt(2 / 200))
    assert_close(xavier_std(100, 300), np.sqrt(2 / 400))
    assert xavier_std(100, 300) != xavier_std(100, 100)  # depends on fan_out too


def test_hidden_init_weights_stats_seed_and_errors():
    W = init_weights(400, 300, "he", seed=3)
    assert W.shape == (400, 300)
    assert abs(W.std() - np.sqrt(2 / 400)) < 0.002 and abs(W.mean()) < 0.002
    V = init_weights(400, 300, "xavier", seed=3)
    assert abs(V.std() - np.sqrt(2 / 700)) < 0.002
    assert_close(init_weights(5, 4, "he", seed=7), init_weights(5, 4, "he", seed=7))
    assert not np.allclose(init_weights(5, 4, "he", seed=7), init_weights(5, 4, "he", seed=8))
    try:
        init_weights(3, 3, "mystery")
    except ValueError:
        return
    raise AssertionError("an unknown init kind must raise ValueError")


def _second_moment_after(kind, act, depth=20, width=256):
    x = np.random.default_rng(0).normal(size=(512, width))
    for layer in range(depth):
        x = act(x @ init_weights(width, width, kind, seed=layer))
    return float((x ** 2).mean())


def test_hidden_he_keeps_relu_signal_alive_and_xavier_does_not():
    relu = lambda z: np.maximum(z, 0.0)
    he = _second_moment_after("he", relu)
    xa = _second_moment_after("xavier", relu)
    assert 0.2 < he < 5.0, f"He init should hold the signal near 1 over 20 ReLU layers, got {he:.3g}"
    assert xa < 0.01 * he, "Xavier under ReLU halves the second moment per layer: it should have collapsed"


def test_hidden_xavier_keeps_tanh_signal_and_oversized_weights_saturate():
    xa = _second_moment_after("xavier", np.tanh, depth=20)
    assert 0.005 < xa < 1.0  # tanh shrinks the signal a little per layer but it stays alive
    x = np.random.default_rng(0).normal(size=(512, 256))
    for layer in range(5):
        x = np.tanh(x @ (np.random.default_rng(layer).normal(size=(256, 256)) * 1.0))
    assert (np.abs(x) > 0.99).mean() > 0.5  # std-1 weights saturate tanh: gradients would vanish


def _bn(seed=0, n=6, d=4):
    r = np.random.default_rng(seed)
    bn = BatchNorm1d(d)
    bn.gamma, bn.beta = r.normal(size=d) + 1.5, r.normal(size=d)
    return bn, r.normal(size=(n, d)) * 2 + 1, r


def test_hidden_batchnorm_forward_matches_formula():
    bn, x, _ = _bn()
    y = bn.forward(x)
    xhat = (x - x.mean(0)) / np.sqrt(x.var(0) + 1e-5)
    assert_close(y, bn.gamma * xhat + bn.beta)


def test_hidden_batchnorm_eps_is_inside_the_sqrt():
    r = np.random.default_rng(2)
    x = r.normal(size=(8, 3)) * 1e-3  # tiny variance: eps dominates
    y = BatchNorm1d(3, eps=1e-5).forward(x)
    assert_close(y, (x - x.mean(0)) / np.sqrt(x.var(0) + 1e-5))


def test_hidden_batchnorm_gradient_check_training():
    bn, x, r = _bn(1)
    up = r.normal(size=x.shape)
    bn.forward(x)
    dx = bn.backward(up)
    dgamma, dbeta = bn.dgamma.copy(), bn.dbeta.copy()
    g0, b0 = bn.gamma.copy(), bn.beta.copy()

    def L(xx=None, g=None, b=None):
        bn.gamma = g0 if g is None else g
        bn.beta = b0 if b is None else b
        out = float((up * bn.forward(x if xx is None else xx)).sum())
        bn.gamma, bn.beta = g0, b0
        return out
    assert dx.shape == x.shape
    grad_check(lambda xx: L(xx=xx), x, dx)
    grad_check(lambda g: L(g=g), g0, dgamma)
    grad_check(lambda b: L(b=b), b0, dbeta)


def test_hidden_batchnorm_dx_sums_to_zero_over_the_batch():
    bn, x, r = _bn(2, n=9)
    bn.forward(x)
    dx = bn.backward(r.normal(size=x.shape))
    assert_close(dx.sum(axis=0), np.zeros(4), atol=1e-9)


def test_hidden_batchnorm_running_stats_update():
    bn, x, _ = _bn(3, n=10)
    bn.forward(x)
    assert_close(bn.running_mean, 0.1 * x.mean(0))
    assert_close(bn.running_var, 0.9 * 1.0 + 0.1 * x.var(0, ddof=1))


def test_hidden_batchnorm_running_stats_converge():
    r = np.random.default_rng(4)
    bn = BatchNorm1d(2)
    for _ in range(300):
        bn.forward(r.normal(size=(64, 2)) * 2.0 + 3.0)
    assert_close(bn.running_mean, [3.0, 3.0], atol=0.2)
    assert_close(bn.running_var, [4.0, 4.0], atol=0.6)


def test_hidden_batchnorm_eval_uses_running_stats_and_does_not_touch_them():
    bn, x, r = _bn(5)
    for _ in range(5):
        bn.forward(r.normal(size=(16, 4)) * 3 + 2)
    rm, rv = bn.running_mean.copy(), bn.running_var.copy()
    bn.eval()
    y = bn.forward(x)
    assert_close(y, bn.gamma * (x - rm) / np.sqrt(rv + 1e-5) + bn.beta)
    assert_close(bn.running_mean, rm)
    assert_close(bn.running_var, rv)
    assert_close(bn.forward(x[:1]), y[:1])  # one example gives the same answer as inside a batch


def test_hidden_batchnorm_train_flag_toggles():
    bn, x, _ = _bn(6)
    bn.eval()
    assert bn.training is False
    bn.train()
    assert bn.training is True


def test_hidden_batchnorm_training_rejects_a_batch_of_one():
    try:
        BatchNorm1d(3).forward(np.ones((1, 3)))
    except ValueError:
        return
    raise AssertionError("a single example has no batch variance: training mode must raise ValueError")


def test_hidden_batchnorm_eval_gradient_check():
    bn, x, r = _bn(7)
    for _ in range(3):
        bn.forward(r.normal(size=(12, 4)))
    bn.eval()
    up = r.normal(size=x.shape)
    bn.forward(x)
    dx = bn.backward(up)
    grad_check(lambda xx: float((up * bn.forward(xx)).sum()), x, dx)
    bn.forward(x)
    bn.backward(up)
    assert_close(bn.dgamma, (up * (x - bn.running_mean) / np.sqrt(bn.running_var + 1e-5)).sum(0))


def test_hidden_batchnorm_constant_feature_is_finite_and_input_untouched():
    x = np.ones((5, 2))
    x[:, 1] = np.arange(5)
    keep = x.copy()
    y = BatchNorm1d(2).forward(x)
    assert np.isfinite(y).all()
    assert_close(x, keep)


def _ln(seed=0, shape=(2, 3, 5)):
    r = np.random.default_rng(seed)
    ln = LayerNorm(shape[-1])
    ln.gamma, ln.beta = r.normal(size=shape[-1]) + 1.5, r.normal(size=shape[-1])
    return ln, r.normal(size=shape) * 2 + 1, r


def test_hidden_layernorm_forward_matches_formula_on_3d():
    ln, x, _ = _ln()
    xhat = (x - x.mean(-1, keepdims=True)) / np.sqrt(x.var(-1, keepdims=True) + 1e-5)
    assert_close(ln.forward(x), ln.gamma * xhat + ln.beta)


def test_hidden_layernorm_each_row_is_independent_of_the_others():
    ln, x, r = _ln(1, shape=(6, 8))
    y = ln.forward(x)
    x2 = x.copy()
    x2[1:] = r.normal(size=(5, 8)) * 10
    assert_close(ln.forward(x2)[0], y[0])
    assert_close(ln.forward(x[:1])[0], y[0])  # also fine at batch size one


def test_hidden_layernorm_gradient_check_3d():
    ln, x, r = _ln(2)
    up = r.normal(size=x.shape)
    ln.forward(x)
    dx = ln.backward(up)
    dgamma, dbeta = ln.dgamma.copy(), ln.dbeta.copy()
    g0, b0 = ln.gamma.copy(), ln.beta.copy()

    def L(xx=None, g=None, b=None):
        ln.gamma = g0 if g is None else g
        ln.beta = b0 if b is None else b
        out = float((up * ln.forward(x if xx is None else xx)).sum())
        ln.gamma, ln.beta = g0, b0
        return out
    assert dx.shape == x.shape and dgamma.shape == (5,) and dbeta.shape == (5,)
    grad_check(lambda xx: L(xx=xx), x, dx)
    grad_check(lambda g: L(g=g), g0, dgamma)
    grad_check(lambda b: L(b=b), b0, dbeta)


def test_hidden_layernorm_constant_row_is_finite_and_equals_beta():
    ln = LayerNorm(4)
    ln.beta = np.array([1.0, 2.0, 3.0, 4.0])
    with np.errstate(all="raise"):
        y = ln.forward(np.full((2, 4), 7.0))
    assert_close(y, np.tile(ln.beta, (2, 1)))


def test_hidden_layernorm_gradients_are_set_not_accumulated():
    ln, x, r = _ln(3, shape=(4, 6))
    up = r.normal(size=x.shape)
    ln.forward(x)
    ln.backward(up)
    first = ln.dgamma.copy()
    ln.forward(x)
    ln.backward(up)
    assert_close(ln.dgamma, first)
    bn, xb, rb = _bn(8)
    upb = rb.normal(size=xb.shape)
    bn.forward(xb)
    bn.backward(upb)
    first = bn.dbeta.copy()
    bn.forward(xb)
    bn.backward(upb)
    assert_close(bn.dbeta, first)
