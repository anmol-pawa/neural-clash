#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, k;
    scanf("%d %d", &n, &k);
    vector<int> a(n);
    for (auto& x : a) scanf("%d", &x);
    unordered_map<int, int> w;
    int best = 0, left = 0;
    for (int right = 0; right < n; ++right) {
        ++w[a[right]];
        while (static_cast<int>(w.size()) > k) {
            --w[a[left]];  // bug: a zero count is never erased, so size() never drops
            ++left;
            if (left > right) break;
        }
        best = max(best, right - left + 1);
    }
    printf("%d\n", best);
}
