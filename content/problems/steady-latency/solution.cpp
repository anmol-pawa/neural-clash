#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, k;
    scanf("%d %d", &n, &k);
    vector<long long> v(n);
    for (auto& x : v) scanf("%lld", &x);
    multiset<long long> window(v.begin(), v.begin() + k);
    auto mid = next(window.begin(), (k - 1) / 2);  // always points at sorted position (k-1)/2
    for (int i = k;; ++i) {
        printf(i == k ? "%lld" : " %lld", *mid);
        if (i == n) break;
        window.insert(v[i]);                 // equal keys go after existing ones
        if (v[i] < *mid) --mid;              // landed before the median: its rank grew by one
        if (v[i - k] <= *mid) ++mid;         // outgoing value at or before the median: step first so erase is safe
        window.erase(window.lower_bound(v[i - k]));  // one copy only, never erase(value)
    }
    puts("");
}
