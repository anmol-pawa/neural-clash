#include <bits/stdc++.h>
using namespace std;

// Specification: for every pair (u, v) walk both up to their meeting node and add the scores.
int main() {
    int n;
    scanf("%d", &n);
    vector<long long> value(n);
    for (auto& x : value) scanf("%lld", &x);
    vector<int> parent(n, -1), depth(n, 0);
    for (int i = 1; i < n; ++i) { scanf("%d", &parent[i]); depth[i] = depth[parent[i]] + 1; }
    long long best = LLONG_MIN;
    for (int u = 0; u < n; ++u) {
        for (int v = u; v < n; ++v) {
            int a = u, b = v;
            long long sum = 0;
            while (a != b) {
                if (depth[a] >= depth[b]) { sum += value[a]; a = parent[a]; }
                else { sum += value[b]; b = parent[b]; }
            }
            sum += value[a];  // the meeting node counts once
            best = max(best, sum);
        }
    }
    printf("%lld\n", best);
}
