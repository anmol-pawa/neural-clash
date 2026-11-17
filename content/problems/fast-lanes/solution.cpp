#include <bits/stdc++.h>
using namespace std;

struct Edge {
    int to;
    long long w;
};

int main() {
    int n, m, k;
    scanf("%d %d %d", &n, &m, &k);
    vector<vector<Edge>> g(n);
    for (int i = 0; i < m; ++i) {
        int u, v;
        long long w;
        scanf("%d %d %lld", &u, &v, &w);
        g[u - 1].push_back({v - 1, w});
    }
    const long long INF = LLONG_MAX / 4;
    // dist[j][v]: cheapest way to stand on service v having used exactly j express lanes.
    vector<vector<long long>> dist(k + 1, vector<long long>(n, INF));
    using State = tuple<long long, int, int>;  // (distance, lanes used, service)
    priority_queue<State, vector<State>, greater<State>> pq;
    dist[0][0] = 0;
    pq.emplace(0, 0, 0);
    while (!pq.empty()) {
        auto [d, j, u] = pq.top();
        pq.pop();
        if (d > dist[j][u]) continue;  // stale entry
        for (const auto& e : g[u]) {
            if (d + e.w < dist[j][e.to]) {  // pay for the link
                dist[j][e.to] = d + e.w;
                pq.emplace(dist[j][e.to], j, e.to);
            }
            if (j < k && d < dist[j + 1][e.to]) {  // spend a lane: the link is free
                dist[j + 1][e.to] = d;
                pq.emplace(d, j + 1, e.to);
            }
        }
    }
    long long best = INF;
    for (int j = 0; j <= k; ++j) best = min(best, dist[j][n - 1]);
    printf("%lld\n", best >= INF ? -1LL : best);
}
