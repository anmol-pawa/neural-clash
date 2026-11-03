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
        if (static_cast<int>(w.size()) > k) {  // bug: throws the whole window away instead of shrinking it
            w.clear();
            w[a[right]] = 1;
            left = right;
        }
        best = max(best, right - left + 1);
    }
    printf("%d\n", best);
}
