#include <bits/stdc++.h>
using namespace std;

// Depth-first search from every node: O(n^2), the specification for small tests.
vector<vector<pair<int, long long>>> adj;
long long far(int v, int from) {
    long long best = 0;
    for (auto [u, w] : adj[v])
        if (u != from) best = max(best, w + far(u, v));
    return best;
}

int main() {
    int n;
    scanf("%d", &n);
    adj.assign(n, {});
    for (int i = 1; i < n; ++i) {
        int p; long long w;
        scanf("%d %lld", &p, &w);
        adj[i].push_back({p, w});
        adj[p].push_back({i, w});
    }
    long long best = 0;
    for (int s = 0; s < n; ++s) best = max(best, far(s, -1));
    printf("%lld\n", best);
}
