class RunningStats:
    def __init__(self):
        self._n = 0
        self._mean = 0.0
        self._m2 = 0.0

    def add(self, x):
        self._n += 1
        delta = x - self._mean
        self._mean += delta / self._n
        self._m2 += delta * (x - self._mean)

    def mean(self):
        return self._mean

    def variance(self):
        return self._m2 / self._n if self._n > 1 else 0.0
