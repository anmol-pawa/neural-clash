#include <bits/stdc++.h>
using namespace std;

// Bellman-Ford style relaxation over (lanes used, service) until nothing improves. Slow but obviously right.
int main() {
    int n, m, k;
    cin >> n >> m >> k;
    vector<array<long long, 3>> es(m);
    for (auto& e : es) { cin >> e[0] >> e[1] >> e[2]; --e[0]; --e[1]; }
    const long long INF = LLONG_MAX / 4;
    vector<vector<long long>> d(k + 1, vector<long long>(n, INF));
    d[0][0] = 0;
    bool changed = true;
    while (changed) {
        changed = false;
        for (int j = 0; j <= k; ++j)
            for (auto& e : es) {
                if (d[j][e[0]] >= INF) continue;
                if (d[j][e[0]] + e[2] < d[j][e[1]]) { d[j][e[1]] = d[j][e[0]] + e[2]; changed = true; }
                if (j < k && d[j][e[0]] < d[j + 1][e[1]]) { d[j + 1][e[1]] = d[j][e[0]]; changed = true; }
            }
    }
    long long best = INF;
    for (int j = 0; j <= k; ++j) best = min(best, d[j][n - 1]);
    cout << (best >= INF ? -1 : best) << "\n";
}
