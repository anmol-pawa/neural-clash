#include <bits/stdc++.h>
using namespace std;

// Correct but slow: picks the next state by scanning all (k+1)n states, O(V^2).
int main() {
    int n, m, k;
    scanf("%d %d %d", &n, &m, &k);
    vector<vector<pair<int, long long>>> g(n);
    for (int i = 0; i < m; ++i) {
        int u, v;
        long long w;
        scanf("%d %d %lld", &u, &v, &w);
        g[u - 1].push_back({v - 1, w});
    }
    const long long INF = LLONG_MAX / 4;
    int V = (k + 1) * n;
    vector<long long> dist(V, INF);
    vector<char> done(V, 0);
    dist[0] = 0;
    for (int it = 0; it < V; ++it) {
        int s = -1;
        for (int i = 0; i < V; ++i)
            if (!done[i] && dist[i] < INF && (s < 0 || dist[i] < dist[s])) s = i;
        if (s < 0) break;
        done[s] = 1;
        int j = s / n, u = s % n;
        for (auto [v, w] : g[u]) {
            dist[j * n + v] = min(dist[j * n + v], dist[s] + w);
            if (j < k) dist[(j + 1) * n + v] = min(dist[(j + 1) * n + v], dist[s]);
        }
    }
    long long best = INF;
    for (int j = 0; j <= k; ++j) best = min(best, dist[j * n + n - 1]);
    printf("%lld\n", best >= INF ? -1LL : best);
}
