#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    scanf("%d", &n);
    vector<vector<pair<int, long long>>> adj(n);
    for (int i = 1; i < n; ++i) {
        int p; long long w;
        scanf("%d %lld", &p, &w);
        adj[i].push_back({p, w});
        adj[p].push_back({i, w});
    }
    long long best = 0;
    // Correct but quadratic: an iterative traversal from every node.
    for (int s = 0; s < n; ++s) {
        vector<long long> dist(n, -1);
        vector<int> stack = {s};
        dist[s] = 0;
        while (!stack.empty()) {
            const int v = stack.back();
            stack.pop_back();
            best = max(best, dist[v]);
            for (auto [u, w] : adj[v])
                if (dist[u] < 0) { dist[u] = dist[v] + w; stack.push_back(u); }
        }
    }
    printf("%lld\n", best);
}
