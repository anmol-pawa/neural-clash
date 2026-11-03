#include <bits/stdc++.h>
using namespace std;

static bool fits(const vector<long long>& len, int batches, long long cap) {
    int used = 1;
    long long run = 0;
    for (long long x : len) {
        if (run + x > cap) { ++used; run = 0; }
        run += x;
    }
    return used <= batches;
}

int main() {
    int n, b;
    scanf("%d %d", &n, &b);
    vector<long long> len(n);
    long long lo = 0;
    for (auto& x : len) { scanf("%lld", &x); lo = max(lo, x); }
    while (!fits(len, b, lo)) ++lo;  // tries every capacity one by one
    printf("%lld\n", lo);
}
