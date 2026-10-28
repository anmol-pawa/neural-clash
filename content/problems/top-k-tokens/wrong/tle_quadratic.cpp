#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, k;
    scanf("%d %d", &n, &k);
    vector<long long> a(n);
    for (auto& x : a) scanf("%lld", &x);
    vector<pair<int, long long>> all;
    vector<char> seen(n, 0);
    for (int i = 0; i < n; ++i) {
        if (seen[i]) continue;
        int c = 0;
        for (int j = i; j < n; ++j)
            if (a[j] == a[i]) { ++c; seen[j] = 1; }
        all.push_back({-c, a[i]});
    }
    sort(all.begin(), all.end());
    for (int i = 0; i < k; ++i) printf(i ? " %lld" : "%lld", all[i].second);
    printf("\n");
}
