#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, k;
    scanf("%d %d", &n, &k);
    vector<long long> load(n);
    for (auto& x : load) scanf("%lld", &x);
    long long best = LLONG_MIN;  // bug: a running maximum over everything seen, not the last k
    for (int i = 0; i < n; ++i) {
        best = max(best, load[i]);
        if (i >= k - 1) printf(i == k - 1 ? "%lld" : " %lld", best);
    }
    puts("");
}
