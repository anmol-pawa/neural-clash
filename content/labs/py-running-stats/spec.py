"""Starter file shown to the player."""


class RunningStats:
    def __init__(self):
        raise NotImplementedError

    def add(self, x):
        raise NotImplementedError

    def mean(self):
        raise NotImplementedError

    def variance(self):
        """Sample variance (n - 1 denominator); 0.0 with fewer than two values."""
        raise NotImplementedError
