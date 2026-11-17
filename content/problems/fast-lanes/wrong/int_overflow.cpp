#include <bits/stdc++.h>
using namespace std;

// Bug: distances are 32-bit ints, so long chains of 10^9 links wrap around.
int main() {
    int n, m, k;
    scanf("%d %d %d", &n, &m, &k);
    vector<vector<pair<int, int>>> g(n);
    for (int i = 0; i < m; ++i) {
        int u, v, w;
        scanf("%d %d %d", &u, &v, &w);
        g[u - 1].push_back({v - 1, w});
    }
    const int INF = INT_MAX / 2;
    vector<vector<int>> dist(k + 1, vector<int>(n, INF));
    using State = tuple<int, int, int>;
    priority_queue<State, vector<State>, greater<State>> pq;
    dist[0][0] = 0;
    pq.emplace(0, 0, 0);
    while (!pq.empty()) {
        auto [d, j, u] = pq.top();
        pq.pop();
        if (d > dist[j][u]) continue;
        for (auto [v, w] : g[u]) {
            if (d + w < dist[j][v]) { dist[j][v] = d + w; pq.emplace(dist[j][v], j, v); }
            if (j < k && d < dist[j + 1][v]) { dist[j + 1][v] = d; pq.emplace(d, j + 1, v); }
        }
    }
    int best = INF;
    for (int j = 0; j <= k; ++j) best = min(best, dist[j][n - 1]);
    printf("%d\n", best >= INF ? -1 : best);
}
