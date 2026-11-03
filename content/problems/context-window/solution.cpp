#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, k;
    scanf("%d %d", &n, &k);
    vector<int> a(n);
    for (auto& x : a) scanf("%d", &x);
    unordered_map<int, int> inWindow;  // token id -> occurrences inside [left, right]
    inWindow.reserve(n * 2);
    int best = 0, left = 0;
    for (int right = 0; right < n; ++right) {
        ++inWindow[a[right]];
        // Invariant: after this loop the window holds at most k distinct ids.
        while (static_cast<int>(inWindow.size()) > k) {
            if (--inWindow[a[left]] == 0) inWindow.erase(a[left]);
            ++left;
        }
        best = max(best, right - left + 1);
    }
    printf("%d\n", best);
}
