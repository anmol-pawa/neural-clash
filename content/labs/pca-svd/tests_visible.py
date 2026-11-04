import numpy as np
from nc_test import assert_close


def test_axis_aligned_cloud():
    X = np.array([[-2.0, 0.0], [2.0, 0.0], [0.0, 0.5], [0.0, -0.5]])
    mean, comps, var = pca_fit(X, 1)
    assert_close(mean, [0.0, 0.0])
    assert_close(comps, [[1.0, 0.0]], atol=1e-6)
    assert var.shape == (1,)


def test_shapes():
    X = np.random.default_rng(1).normal(size=(30, 5))
    mean, comps, var = pca_fit(X, 3)
    assert mean.shape == (5,) and comps.shape == (3, 5) and var.shape == (3,)
    assert pca_transform(X, mean, comps).shape == (30, 3)
