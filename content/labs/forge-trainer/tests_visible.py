import numpy as np


def test_minibatches_cover_every_index_once():
    batches = minibatches(10, 4, seed=0)
    assert sorted(np.concatenate(batches).tolist()) == list(range(10))
    assert [len(b) for b in batches] == [4, 4, 2]


def test_early_stopping_stops_after_patience():
    es = EarlyStopping(patience=2)
    p = [np.zeros(1)]
    assert es.update(1.0, p) is False
    assert es.update(1.5, p) is False
    assert es.update(1.6, p) is True
