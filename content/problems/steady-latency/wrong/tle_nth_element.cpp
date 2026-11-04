#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, k;
    scanf("%d %d", &n, &k);
    vector<long long> v(n);
    for (auto& x : v) scanf("%lld", &x);
    for (int i = 0; i + k <= n; ++i) {
        vector<long long> w(v.begin() + i, v.begin() + i + k);
        nth_element(w.begin(), w.begin() + (k - 1) / 2, w.end());  // O(k) per window: O(n*k) total
        printf(i ? " %lld" : "%lld", w[(k - 1) / 2]);
    }
    puts("");
}
