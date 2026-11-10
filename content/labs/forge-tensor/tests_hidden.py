import numpy as np
from nc_test import assert_close, grad_check


def _check(build, *arrays, tol=1e-6):
    """Compare Tensor.backward with central differences for every input array.

    build(*Tensors) must return a Tensor; its (scalar) sum is the objective.
    """
    tensors = [Tensor(a) for a in arrays]
    build(*tensors).sum().backward()
    for i, t in enumerate(tensors):
        def f(x, i=i):
            ins = [Tensor(a) for a in arrays]
            ins[i] = Tensor(x)
            return float(build(*ins).sum().data)
        assert t.grad.shape == arrays[i].shape, f"input {i}: grad shape {t.grad.shape} != {arrays[i].shape}"
        grad_check(f, arrays[i], t.grad, tol=tol)


def _rng(seed=0):
    return np.random.default_rng(seed)


def test_hidden_row_bias_broadcast():
    r = _rng(1)
    _check(lambda x, b: (x + b) * (x + b), r.normal(size=(5, 3)), r.normal(size=(3,)))
    _check(lambda x, b: x * b, r.normal(size=(5, 3)), r.normal(size=(1, 3)))


def test_hidden_column_and_scalar_broadcast():
    r = _rng(2)
    _check(lambda x, c: x * c + c, r.normal(size=(4, 3)), r.normal(size=(4, 1)))
    _check(lambda x, s: (x - s) ** 2, r.normal(size=(2, 5)), r.normal(size=()))
    _check(lambda a, b: a * b, r.normal(size=(3, 1)), r.normal(size=(1, 4)))


def test_hidden_leading_axes_broadcast():
    r = _rng(3)
    _check(lambda x, b: x * b, r.normal(size=(2, 3, 4)), r.normal(size=(4,)))
    _check(lambda x, b: x + b, r.normal(size=(2, 3, 4)), r.normal(size=(3, 1)))


def test_hidden_matmul():
    r = _rng(4)
    _check(lambda a, b: a @ b, r.normal(size=(3, 4)), r.normal(size=(4, 2)))
    _check(lambda a, b: (a @ b).tanh(), r.normal(size=(5, 3)), r.normal(size=(3, 3)))


def test_hidden_linear_layer_with_bias():
    r = _rng(5)
    _check(lambda x, w, b: (x @ w + b).tanh() ** 2, r.normal(size=(6, 4)), r.normal(size=(4, 3)), r.normal(size=(3,)))


def test_hidden_sum_axes_and_keepdims():
    r = _rng(6)
    x = r.normal(size=(3, 4))
    _check(lambda t: t.sum(axis=0) * t.sum(axis=0), x)
    _check(lambda t: t.sum(axis=1) * t.sum(axis=1), x)
    _check(lambda t: t * t.sum(axis=1, keepdims=True), x)
    _check(lambda t: t * t.sum(axis=0, keepdims=True), x)
    _check(lambda t: t.sum() * t, x)


def test_hidden_mean_scaling():
    r = _rng(7)
    x = r.normal(size=(3, 4))
    t = Tensor(x)
    t.mean().backward()
    assert_close(t.grad, np.full((3, 4), 1 / 12))
    _check(lambda t: (t - t.mean(axis=0, keepdims=True)) ** 2, x)
    _check(lambda t: t.mean(axis=1) ** 2, x)


def test_hidden_elementwise_functions():
    r = _rng(8)
    x = r.uniform(0.3, 1.5, size=(3, 3))
    _check(lambda t: t.exp().log() + t.tanh(), x)
    _check(lambda t: t ** 3 + t ** -1 + t ** 0.5, x)
    y = r.normal(size=(4, 4)) + 0.2
    _check(lambda t: t.relu() * 3, y)


def test_hidden_relu_gates_per_element():
    t = Tensor([[2.0, -2.0], [-0.5, 0.5]])
    t.relu().sum().backward()
    assert_close(t.grad, [[1.0, 0.0], [0.0, 1.0]])


def test_hidden_reuse_accumulates():
    r = _rng(9)
    _check(lambda a: a * a * a + a, r.normal(size=(3, 2)))
    _check(lambda a, b: (a @ b) @ b.T, r.normal(size=(2, 3)), r.normal(size=(3, 3)))


def test_hidden_diamond_needs_topological_order():
    r = _rng(10)

    def f(a):
        b = a * 2.0
        c = a * a
        return b + c * b
    _check(f, r.normal(size=(2, 3)))


def test_hidden_division_and_reverse_ops():
    r = _rng(11)
    _check(lambda a, b: a / b + 2.0 / b - 1.0 - (a - 3.0), r.uniform(0.5, 2, size=(3, 3)), r.uniform(0.5, 2, size=(3,)))


def test_hidden_transpose():
    r = _rng(12)
    _check(lambda a: a.T * np.arange(6.0).reshape(3, 2), r.normal(size=(2, 3)))
    _check(lambda a, b: a @ b.T, r.normal(size=(4, 3)), r.normal(size=(2, 3)))


def test_hidden_softmax_cross_entropy_pipeline():
    r = _rng(13)
    x, w, labels = r.normal(size=(5, 4)), r.normal(size=(4, 3)), np.eye(3)[[0, 2, 1, 1, 0]]

    def loss(x, w):
        z = x @ w
        p = z.exp() / z.exp().sum(axis=1, keepdims=True)
        return -(p.log() * labels).sum(axis=1).mean()
    _check(loss, x, w)
    t = Tensor(w)
    loss(Tensor(x), t).backward()  # also runs when called on the shared graph twice
    assert t.grad.shape == w.shape


def test_hidden_grads_start_zero_and_shapes_match():
    a = Tensor(np.ones((2, 3)))
    assert a.grad.shape == (2, 3) and not a.grad.any()
    ((a * 2.0).sum() * 3.0).backward()
    assert_close(a.grad, np.full((2, 3), 6.0))


def test_hidden_mean_values_over_axes():
    x = np.arange(12.0).reshape(3, 4)
    assert_close(Tensor(x).mean(axis=1).data, x.mean(axis=1))
    assert_close(Tensor(x).mean(axis=0, keepdims=True).data, x.mean(axis=0, keepdims=True))
    assert_close(Tensor(x).mean().data, x.mean())


def test_hidden_reused_activation_accumulates():
    r = _rng(14)

    def f(a, b):
        h = (a @ b).tanh()
        return h * h + h.sum(axis=1, keepdims=True)
    _check(f, r.normal(size=(3, 4)), r.normal(size=(4, 2)))
    _check(lambda a: a.exp() * a.exp() + a.relu() * a.relu(), r.normal(size=(2, 3)))


def test_hidden_tanh_adds_to_existing_gradient():
    # z = tanh(x) + x: the add's backward deposits 1 on x *before* tanh's backward runs (tanh is
    # upstream of x in the graph), so a backward that assigns instead of accumulating loses it.
    x = Tensor(np.array([0.3, -0.7, 1.2]))
    (x.tanh() + x).sum().backward()
    assert_close(x.grad, 1.0 + (1.0 - np.tanh(x.data) ** 2))
