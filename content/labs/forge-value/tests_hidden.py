import math
import random
from nc_test import assert_close


def _fd(build, xs, eps=1e-6):
    """Central finite differences of build(*Values).data w.r.t. each float in xs."""
    grads = []
    for i in range(len(xs)):
        hi = list(xs); lo = list(xs)
        hi[i] += eps; lo[i] -= eps
        grads.append((build(*[Value(v) for v in hi]).data - build(*[Value(v) for v in lo]).data) / (2 * eps))
    return grads


def _check(build, xs, tol=1e-5):
    vals = [Value(v) for v in xs]
    out = build(*vals)
    out.backward()
    for v, g in zip(vals, _fd(build, xs)):
        assert abs(v.grad - g) < tol * max(1.0, abs(g)), f"grad {v.grad} vs finite difference {g}"


def test_diamond_graph():
    # a feeds b and c, which join again: needs topological order AND accumulation
    def f(a):
        b = a * 2
        c = a * a
        return b + c * b
    _check(f, [1.7])


def test_deep_chain_matches_finite_differences():
    def f(x, w, b):
        return ((x * w + b).tanh() * w - b ** 2).exp() / (1 + x * x)
    _check(f, [0.3, -0.8, 0.5])


def test_pow_and_division():
    _check(lambda a, b: a ** 3 / b + b ** -2 * a, [1.4, 2.2])
    _check(lambda a: a ** 0.5 + 3 / a, [2.5])


def test_log_exp_roundtrip_gradient():
    _check(lambda a, b: (a.exp() * b).log() + b.exp(), [0.4, 1.3])


def test_relu_gates_the_gradient():
    pos, neg = Value(2.0), Value(-2.0)
    out = pos.relu() * 3 + neg.relu() * 5
    out.backward()
    assert_close(pos.grad, 3.0)
    assert_close(neg.grad, 0.0)
    assert_close(out.data, 6.0)


def test_tanh_derivative_value():
    x = Value(0.5)
    y = x.tanh()
    y.backward()
    assert_close(x.grad, 1 - math.tanh(0.5) ** 2)


def test_subtraction_and_reverse_ops():
    _check(lambda a, b: 5 - a * b + (2 / b) - (a - 1) * 3, [0.9, 1.6])


def test_every_node_gets_a_gradient():
    a, b = Value(1.5), Value(-0.5)
    c = a * b
    d = c + a
    e = d * d
    e.backward()
    assert_close(e.grad, 1.0)
    assert_close(d.grad, 2 * d.data)
    assert_close(c.grad, 2 * d.data)
    assert_close(a.grad, 2 * d.data * (b.data + 1))
    assert_close(b.grad, 2 * d.data * a.data)


def test_random_expression_graphs():
    rng = random.Random(11)
    for _ in range(25):
        k1, k2, k3 = rng.uniform(0.5, 2), rng.uniform(0.5, 2), rng.uniform(-1, 1)
        def f(x, y):
            u = x * y + k1
            v = (u * k2 - x).tanh()
            return v * u + y ** 2 * k3 + u.relu()
        _check(f, [rng.uniform(0.2, 1.5), rng.uniform(0.2, 1.5)])


def test_grad_starts_at_zero_and_leaves_independent():
    x = Value(2.0)
    assert x.grad == 0.0
    y = Value(3.0)
    (x * 2).backward()
    assert_close(x.grad, 2.0)
    assert y.grad == 0.0


def test_long_chain_no_recursion_trouble():
    x = Value(1.0001)
    y = x
    for _ in range(300):
        y = y * 1.001
    y.backward()
    assert_close(x.grad, 1.001 ** 300, rtol=1e-6)
