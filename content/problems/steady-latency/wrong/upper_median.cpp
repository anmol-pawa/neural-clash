#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, k;
    scanf("%d %d", &n, &k);
    vector<long long> v(n);
    for (auto& x : v) scanf("%lld", &x);
    multiset<long long> window(v.begin(), v.begin() + k);
    auto mid = next(window.begin(), k / 2);  // bug: upper median for even k
    for (int i = k;; ++i) {
        printf(i == k ? "%lld" : " %lld", *mid);
        if (i == n) break;
        window.insert(v[i]);
        if (v[i] < *mid) --mid;
        if (v[i - k] <= *mid) ++mid;
        window.erase(window.lower_bound(v[i - k]));
    }
    puts("");
}
