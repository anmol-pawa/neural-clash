#include <bits/stdc++.h>
using namespace std;

// Bug: takes one plain shortest path and waives its k heaviest links. A different route can win.
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
    vector<long long> dist(n, INF), edgeIn(n, 0);
    vector<int> par(n, -1);
    priority_queue<pair<long long, int>, vector<pair<long long, int>>, greater<>> pq;
    dist[0] = 0;
    pq.push({0, 0});
    while (!pq.empty()) {
        auto [d, u] = pq.top();
        pq.pop();
        if (d > dist[u]) continue;
        for (auto [v, w] : g[u])
            if (d + w < dist[v]) { dist[v] = d + w; par[v] = u; edgeIn[v] = w; pq.push({dist[v], v}); }
    }
    if (dist[n - 1] >= INF) { puts("-1"); return 0; }
    vector<long long> ws;
    for (int v = n - 1; v != 0; v = par[v]) ws.push_back(edgeIn[v]);
    sort(ws.rbegin(), ws.rend());
    long long total = dist[n - 1];
    for (int i = 0; i < k && i < (int)ws.size(); ++i) total -= ws[i];
    printf("%lld\n", total);
}
