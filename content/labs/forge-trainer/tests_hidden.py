import numpy as np
from nc_test import assert_close


class Logistic:
    """A tiny softmax-regression model used as the test subject (the Lab's fit must work with any such model)."""

    def __init__(self, d, c, seed=0):
        r = np.random.default_rng(seed)
        self.W, self.b = r.normal(size=(d, c)) * 0.1, np.zeros(c)
        self.dW, self.db = np.zeros_like(self.W), np.zeros_like(self.b)
        self.rows = []

    def params(self):
        return [self.W, self.b]

    def loss_and_backward(self, X, y):
        self.rows.append(len(X))
        z = X @ self.W + self.b
        z = z - z.max(1, keepdims=True)
        lp = z - np.log(np.exp(z).sum(1, keepdims=True))
        n = len(y)
        d = np.exp(lp)
        d[np.arange(n), y] -= 1
        d /= n
        self.dW, self.db = X.T @ d, d.sum(0)
        return float(-lp[np.arange(n), y].mean())

    def step(self, lr):
        self.W -= lr * self.dW
        self.b -= lr * self.db


def _overfit_data():
    r = np.random.default_rng(0)
    Xtr, ytr = r.normal(size=(24, 30)), r.integers(0, 2, size=24)  # 30 noise features, 24 labels: memorisable
    Xva, yva = r.normal(size=(200, 30)), r.integers(0, 2, size=200)  # labels independent of features
    return Xtr, ytr, Xva, yva


def test_hidden_minibatches_partition_and_sizes():
    for n, bs in [(10, 4), (12, 4), (7, 10), (1, 1)]:
        batches = minibatches(n, bs, seed=3, epoch=1)
        flat = np.concatenate(batches)
        assert sorted(flat.tolist()) == list(range(n)), "every index exactly once"
        assert [len(b) for b in batches] == [min(bs, n - i) for i in range(0, n, bs)]


def test_hidden_minibatches_shuffle_and_are_deterministic():
    a = np.concatenate(minibatches(50, 8, seed=1, epoch=0))
    assert not np.array_equal(a, np.arange(50)), "must shuffle"
    assert_close(a, np.concatenate(minibatches(50, 8, seed=1, epoch=0)))
    assert not np.array_equal(a, np.concatenate(minibatches(50, 8, seed=1, epoch=1))), "each epoch reshuffles"
    assert not np.array_equal(a, np.concatenate(minibatches(50, 8, seed=2, epoch=0))), "the seed matters"
    assert_close(a, np.random.default_rng([1, 0]).permutation(50))


def test_hidden_early_stopping_counts_patience_exactly():
    es = EarlyStopping(patience=3)
    p = [np.zeros(2)]
    verdicts = [es.update(v, p) for v in [5.0, 4.0, 4.5, 4.2, 4.1]]
    assert verdicts == [False, False, False, False, True]
    assert es.best_loss == 4.0 and es.best_epoch == 1 and es.bad_epochs == 3


def test_hidden_early_stopping_improvement_resets_the_counter():
    es = EarlyStopping(patience=2)
    p = [np.zeros(1)]
    out = [es.update(v, p) for v in [3.0, 3.1, 2.0, 2.1, 1.0, 1.1, 1.2]]
    assert out == [False, False, False, False, False, False, True]
    assert es.best_epoch == 4


def test_hidden_early_stopping_ties_are_not_improvements():
    es = EarlyStopping(patience=2)
    p = [np.zeros(1)]
    assert [es.update(1.0, p), es.update(1.0, p), es.update(1.0, p)] == [False, False, True]
    assert es.best_epoch == 0


def test_hidden_early_stopping_min_delta():
    es = EarlyStopping(patience=2, min_delta=0.1)
    p = [np.zeros(1)]
    assert [es.update(v, p) for v in [1.0, 0.95, 0.93]] == [False, False, True]
    assert es.best_loss == 1.0 and es.best_epoch == 0
    es2 = EarlyStopping(patience=2, min_delta=0.1)
    assert [es2.update(v, p) for v in [1.0, 0.85, 0.7]] == [False, False, False]


def test_hidden_early_stopping_snapshot_is_a_copy_and_restore_is_in_place():
    w = np.array([1.0, 2.0])
    live = [w]
    es = EarlyStopping(patience=5)
    es.update(1.0, live)
    w += 10.0  # training keeps moving the live weights
    es.update(2.0, live)
    assert_close(es.best_params[0], [1.0, 2.0])
    es.restore(live)
    assert live[0] is w
    assert_close(w, [1.0, 2.0])


def test_hidden_fit_restores_the_best_weights():
    Xtr, ytr, Xva, yva = _overfit_data()
    model = Logistic(30, 2)
    out = fit(model, Xtr, ytr, Xva, yva, lr=0.5, batch_size=8, max_epochs=300, patience=5, seed=1)
    val = out["val_losses"]
    assert out["best_epoch"] == int(np.argmin(val))
    assert model.loss_and_backward(Xva, yva) == min(val) or abs(model.loss_and_backward(Xva, yva) - min(val)) < 1e-12


def test_hidden_fit_stops_exactly_patience_epochs_after_the_best():
    Xtr, ytr, Xva, yva = _overfit_data()
    out = fit(Logistic(30, 2), Xtr, ytr, Xva, yva, lr=0.5, batch_size=8, max_epochs=300, patience=4, seed=1)
    assert out["stopped_epoch"] < 299, "the model memorises noise: validation loss must turn up and trigger the stop"
    assert out["stopped_epoch"] - out["best_epoch"] == 4
    assert len(out["val_losses"]) == len(out["train_losses"]) == out["stopped_epoch"] + 1


def test_hidden_fit_respects_max_epochs():
    Xtr, ytr, Xva, yva = _overfit_data()
    out = fit(Logistic(30, 2), Xtr, ytr, Xva, yva, lr=0.01, batch_size=8, max_epochs=6, patience=1000)
    assert len(out["val_losses"]) == 6 and out["stopped_epoch"] == 5


def test_hidden_fit_uses_every_training_example_each_epoch_and_validates_on_val():
    Xtr, ytr, Xva, yva = _overfit_data()
    model = Logistic(30, 2)
    fit(model, Xtr, ytr, Xva, yva, lr=0.1, batch_size=10, max_epochs=1, patience=3)
    assert model.rows == [10, 10, 4, 200]  # 24 training rows in batches of 10, then one validation pass


def test_hidden_fit_train_loss_is_example_weighted():
    Xtr, ytr, Xva, yva = _overfit_data()

    class Probe(Logistic):
        def __init__(self):
            super().__init__(30, 2)
            self.seen = []

        def loss_and_backward(self, X, y):
            v = super().loss_and_backward(X, y)
            self.seen.append((v, len(X)))
            return v
    m = Probe()
    out = fit(m, Xtr, ytr, Xva, yva, lr=0.1, batch_size=10, max_epochs=1)
    want = sum(v * n for v, n in m.seen[:3]) / 24
    assert abs(out["train_losses"][0] - want) < 1e-12


def test_hidden_fit_is_deterministic_for_a_seed():
    Xtr, ytr, Xva, yva = _overfit_data()
    a = fit(Logistic(30, 2), Xtr, ytr, Xva, yva, batch_size=8, max_epochs=20, seed=5)
    b = fit(Logistic(30, 2), Xtr, ytr, Xva, yva, batch_size=8, max_epochs=20, seed=5)
    c = fit(Logistic(30, 2), Xtr, ytr, Xva, yva, batch_size=8, max_epochs=20, seed=6)
    assert a["val_losses"] == b["val_losses"] and a["val_losses"] != c["val_losses"]


def test_hidden_fit_reshuffles_every_epoch_and_covers_the_data():
    n = 20
    Xtr = np.arange(n, dtype=float).reshape(n, 1)
    ytr = np.zeros(n, dtype=int)
    Xva, yva = np.zeros((3, 1)), np.zeros(3, dtype=int)

    class Recorder:
        def __init__(self):
            self.w = np.zeros(1)
            self.epochs, self.cur = [], []

        def params(self):
            return [self.w]

        def loss_and_backward(self, X, y):
            if len(X) == 3:  # the validation pass closes the epoch
                self.epochs.append(self.cur)
                self.cur = []
            else:
                self.cur += X[:, 0].astype(int).tolist()
            return 1.0

        def step(self, lr):
            pass
    m = Recorder()
    fit(m, Xtr, ytr, Xva, yva, batch_size=6, max_epochs=3, patience=10, seed=2)
    assert len(m.epochs) == 3
    for e in m.epochs:
        assert sorted(e) == list(range(n))
    assert m.epochs[0] != m.epochs[1] != m.epochs[2]
