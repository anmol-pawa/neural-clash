#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, k;
    cin >> n >> k;
    vector<int> a(n);
    for (auto& x : a) cin >> x;
    int best = 0;
    for (int i = 0; i < n; ++i) {
        set<int> seen;
        for (int j = i; j < n; ++j) {
            seen.insert(a[j]);
            if (static_cast<int>(seen.size()) > k) break;
            best = max(best, j - i + 1);
        }
    }
    cout << best << "\n";
}
