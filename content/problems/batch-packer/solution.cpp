#include <bits/stdc++.h>
using namespace std;

// Can the sequences be split, in order, into at most `batches` runs whose sums are all <= cap?
static bool fits(const vector<long long>& len, int batches, long long cap) {
    int used = 1;
    long long run = 0;
    for (long long x : len) {
        if (run + x > cap) {  // start a new batch
            ++used;
            run = 0;
        }
        run += x;
    }
    return used <= batches;
}

int main() {
    int n, b;
    scanf("%d %d", &n, &b);
    vector<long long> len(n);
    long long lo = 0, hi = 0;
    for (auto& x : len) {
        scanf("%lld", &x);
        lo = max(lo, x);  // no batch can be smaller than the longest sequence
        hi += x;          // one batch holding everything always works
    }
    while (lo < hi) {  // smallest cap for which fits() is true (fits is monotone in cap)
        long long mid = lo + (hi - lo) / 2;
        if (fits(len, b, mid)) hi = mid;
        else lo = mid + 1;
    }
    printf("%lld\n", lo);
}
