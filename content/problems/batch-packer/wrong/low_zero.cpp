#include <bits/stdc++.h>
using namespace std;

static bool fits(const vector<long long>& len, int batches, long long cap) {
    int used = 1;
    long long run = 0;
    for (long long x : len) {
        if (run + x > cap) { ++used; run = 0; }
        run += x;  // bug path: when x > cap this still "fits" in a fresh batch
    }
    return used <= batches;
}

int main() {
    int n, b;
    scanf("%d %d", &n, &b);
    vector<long long> len(n);
    long long lo = 0, hi = 0;  // bug: lo should start at max(len)
    for (auto& x : len) { scanf("%lld", &x); hi += x; }
    while (lo < hi) {
        long long mid = lo + (hi - lo) / 2;
        if (fits(len, b, mid)) hi = mid; else lo = mid + 1;
    }
    printf("%lld\n", lo);
}
