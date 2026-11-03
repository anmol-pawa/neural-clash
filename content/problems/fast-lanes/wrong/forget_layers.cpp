#include <bits/stdc++.h>
using namespace std;

// Bug: one best distance per service. A state that arrived cheaply but spent lanes blocks the one that kept them.
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
    vector<long long> dist(n, INF);
    using State = tuple<long long, int, int>;  // distance, lanes left, node
    priority_queue<State, vector<State>, greater<>> pq;
    dist[0] = 0;
    pq.emplace(0, k, 0);
    while (!pq.empty()) {
        auto [d, left, u] = pq.top();
        pq.pop();
        if (d > dist[u]) continue;
        for (auto [v, w] : g[u]) {
            long long nd = d + w;
            int nl = left;
            if (left > 0 && w > 0) { nd = d; nl = left - 1; }  // greedily waive the first paid link
            if (nd < dist[v]) { dist[v] = nd; pq.emplace(nd, nl, v); }
        }
    }
    printf("%lld\n", dist[n - 1] >= INF ? -1LL : dist[n - 1]);
}
