import numpy as np
from nc_test import assert_close, grad_check


def test_hidden_dropout_keeps_expectation_and_drop_rate():
    d = Dropout(0.3, seed=1)
    y = d.forward(np.ones((1000, 100)))
    assert abs(y.mean() - 1.0) < 0.02
    assert abs((y == 0).mean() - 0.3) < 0.01
    assert_close(np.unique(y[y != 0]), [1 / 0.7])


def test_hidden_dropout_mask_matches_the_documented_draw():
    d = Dropout(0.4, seed=5)
    x = np.arange(1.0, 13.0).reshape(3, 4)
    mask = (np.random.default_rng(5).random(x.shape) >= 0.4) / 0.6
    assert_close(d.forward(x), x * mask)


def test_hidden_dropout_fresh_mask_every_call():
    d = Dropout(0.5, seed=2)
    x = np.ones((50, 50))
    assert not np.array_equal(d.forward(x), d.forward(x))


def test_hidden_dropout_eval_and_p_zero_are_identity():
    x = np.random.default_rng(0).normal(size=(4, 5))
    d = Dropout(0.9)
    d.eval()
    assert_close(d.forward(x), x)
    assert_close(d.backward(x), x)
    d.train()
    assert_close(Dropout(0.0).forward(x), x)


def test_hidden_dropout_backward_reuses_the_forward_mask():
    d = Dropout(0.5, seed=3)
    x = np.ones((20, 20))
    y = d.forward(x)
    up = np.random.default_rng(1).normal(size=x.shape)
    assert_close(d.backward(up), up * y)  # x is ones, so y is exactly the mask


def test_hidden_dropout_does_not_mutate_input_and_is_seeded():
    x = np.ones((6, 6))
    keep = x.copy()
    a = Dropout(0.5, seed=4).forward(x)
    assert_close(x, keep)
    assert_close(a, Dropout(0.5, seed=4).forward(x))


def test_hidden_dropout_rejects_bad_p():
    for p in (-0.1, 1.0, 1.5):
        try:
            Dropout(p)
        except ValueError:
            continue
        raise AssertionError(f"p={p} must raise ValueError")


def test_hidden_sgd_momentum_two_steps_exact():
    p = np.array([1.0, -2.0])
    opt = SGD([p], lr=0.1, momentum=0.9)
    g = np.array([1.0, 1.0])
    opt.step([g])
    assert_close(p, [0.9, -2.1])
    opt.step([g])  # v = 0.9*1 + 1 = 1.9
    assert_close(p, [0.9 - 0.19, -2.1 - 0.19])


def test_hidden_sgd_weight_decay_is_l2_in_the_gradient():
    p = np.array([2.0, -4.0])
    SGD([p], lr=0.1, weight_decay=0.5).step([np.zeros(2)])
    assert_close(p, [2.0 - 0.1 * 0.5 * 2.0, -4.0 + 0.1 * 0.5 * 4.0])


def test_hidden_sgd_updates_in_place_and_leaves_grads_alone():
    a, b = np.ones(3), np.ones((2, 2))
    held = [a, b]
    g = [np.full(3, 2.0), np.full((2, 2), 3.0)]
    keep = [x.copy() for x in g]
    SGD(held, lr=0.1, momentum=0.5, weight_decay=0.1).step(g)
    assert not np.allclose(a, 1.0) and not np.allclose(b, 1.0)
    for x, k in zip(g, keep):
        assert_close(x, k)


def _bowl(opt_factory, steps, curv=(1.0, 50.0)):
    p = np.array([1.0, 1.0])
    h = np.array(curv)
    opt = opt_factory([p])
    for _ in range(steps):
        opt.step([h * p])
    return float(0.5 * (h * p * p).sum())


def test_hidden_momentum_beats_plain_sgd_on_an_ill_conditioned_bowl():
    plain = _bowl(lambda ps: SGD(ps, lr=0.019), 100)
    mom = _bowl(lambda ps: SGD(ps, lr=0.019, momentum=0.9), 100)
    assert mom < plain * 0.1, (plain, mom)


def _adamw_oracle(p0, grads, lr, wd, b1=0.9, b2=0.999, eps=1e-8):
    p, m, v = p0.copy(), np.zeros_like(p0), np.zeros_like(p0)
    for t, g in enumerate(grads, start=1):
        p = p * (1 - lr * wd)
        m = b1 * m + (1 - b1) * g
        v = b2 * v + (1 - b2) * g ** 2
        p = p - lr * (m / (1 - b1 ** t)) / (np.sqrt(v / (1 - b2 ** t)) + eps)
    return p


def test_hidden_adamw_matches_reference_over_several_steps():
    r = np.random.default_rng(0)
    p0 = r.normal(size=(3, 2))
    grads = [r.normal(size=(3, 2)) for _ in range(6)]
    p = p0.copy()
    opt = AdamW([p], lr=0.01, weight_decay=0.1)
    for g in grads:
        opt.step([g])
    assert_close(p, _adamw_oracle(p0, grads, 0.01, 0.1), rtol=1e-9)


def test_hidden_adamw_first_step_is_lr_times_sign_thanks_to_bias_correction():
    p = np.array([0.0, 0.0, 0.0])
    AdamW([p], lr=0.1, weight_decay=0.0).step([np.array([3.0, -0.2, 40.0])])
    assert_close(p, [-0.1, 0.1, -0.1], atol=1e-6)


def test_hidden_adamw_tiny_gradients_and_eps_placement():
    r = np.random.default_rng(1)
    p0 = r.normal(size=4)
    grads = [r.normal(size=4) * 1e-9 for _ in range(3)]
    p = p0.copy()
    opt = AdamW([p], lr=0.1, weight_decay=0.0)
    for g in grads:
        opt.step([g])
    assert_close(p, _adamw_oracle(p0, grads, 0.1, 0.0), rtol=1e-9)


def test_hidden_adamw_decay_is_decoupled_from_the_gradient():
    p = np.array([2.0, -3.0])
    opt = AdamW([p], lr=0.1, weight_decay=0.5)
    opt.step([np.zeros(2)])
    assert_close(p, np.array([2.0, -3.0]) * (1 - 0.1 * 0.5))  # exactly the shrink, nothing else
    opt.step([np.zeros(2)])
    assert_close(p, np.array([2.0, -3.0]) * (1 - 0.05) ** 2)


def test_hidden_adamw_is_scale_invariant_in_the_gradient():
    g = np.random.default_rng(2).normal(size=5)
    a, b = np.ones(5), np.ones(5)
    AdamW([a], lr=0.01, weight_decay=0.0).step([g])
    AdamW([b], lr=0.01, weight_decay=0.0).step([g * 1000])
    assert_close(a, b, rtol=1e-6)


def test_hidden_adamw_updates_in_place_and_converges():
    p = np.array([3.0, -2.0])
    held = p
    opt = AdamW([p], lr=0.1, weight_decay=0.0)
    for _ in range(300):
        opt.step([p.copy()])  # gradient of 0.5*||p||^2
    assert held is p and np.abs(p).max() < 0.05
