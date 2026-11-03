#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, k;
    scanf("%d %d", &n, &k);
    vector<long long> load(n);
    for (auto& x : load) scanf("%lld", &x);
    for (int i = 0; i + k <= n; ++i) {
        long long best = load[i];
        for (int j = i; j < i + k; ++j) best = max(best, load[j]);
        printf(i ? " %lld" : "%lld", best);
    }
    puts("");
}
