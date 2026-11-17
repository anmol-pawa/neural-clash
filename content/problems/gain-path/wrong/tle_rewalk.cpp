#include <bits/stdc++.h>
using namespace std;

int n;
vector<long long> gain;
vector<int> lc, rc;

// Correct but slow: recomputes the best downward chain from scratch, with no memo.
long long chain(int v) {
    long long l = lc[v] >= 0 ? max(0LL, chain(lc[v])) : 0;
    long long r = rc[v] >= 0 ? max(0LL, chain(rc[v])) : 0;
    return gain[v] + max(l, r);
}

int main() {
    scanf("%d", &n);
    gain.resize(n); lc.resize(n); rc.resize(n);
    for (int v = 0; v < n; ++v) scanf("%lld %d %d", &gain[v], &lc[v], &rc[v]);
    long long best = LLONG_MIN;
    // bug: calls chain() again for each node's children, so a deep tree costs O(n^2)
    for (int v = 0; v < n; ++v) {
        long long l = lc[v] >= 0 ? max(0LL, chain(lc[v])) : 0;
        long long r = rc[v] >= 0 ? max(0LL, chain(rc[v])) : 0;
        best = max(best, gain[v] + l + r);
    }
    printf("%lld\n", best);
}
