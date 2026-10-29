class RunningStats:
    n = 0
    _mean = 0.0
    _m2 = 0.0

    def __init__(self):
        pass

    def add(self, x):
        RunningStats.n += 1
        delta = x - RunningStats._mean
        RunningStats._mean += delta / RunningStats.n
        RunningStats._m2 += delta * (x - RunningStats._mean)

    def mean(self):
        return RunningStats._mean

    def variance(self):
        return RunningStats._m2 / (RunningStats.n - 1) if RunningStats.n > 1 else 0.0
