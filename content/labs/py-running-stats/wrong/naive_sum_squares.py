class RunningStats:
    def __init__(self):
        self._n = 0
        self._sum = 0.0
        self._sq = 0.0

    def add(self, x):
        self._n += 1
        self._sum += x
        self._sq += x * x

    def mean(self):
        return self._sum / self._n

    def variance(self):
        if self._n < 2:
            return 0.0
        m = self._sum / self._n
        return (self._sq - self._n * m * m) / (self._n - 1)
