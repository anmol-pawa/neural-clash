#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    scanf("%d", &n);
    vector<long long> value(n);
    for (auto& x : value) scanf("%lld", &x);
    vector<int> parent(n, -1);
    vector<vector<int>> adj(n);
    for (int i = 1; i < n; ++i) { scanf("%d", &parent[i]); adj[i].push_back(parent[i]); adj[parent[i]].push_back(i); }
    long long best = LLONG_MIN;
    // bug (speed): a full traversal from every start node, O(n^2)
    vector<long long> sum(n);
    vector<int> from(n), stack;
    for (int s = 0; s < n; ++s) {
        stack.assign(1, s);
        sum[s] = value[s];
        from[s] = -1;
        while (!stack.empty()) {
            const int u = stack.back();
            stack.pop_back();
            best = max(best, sum[u]);
            for (int w : adj[u]) {
                if (w == from[u]) continue;
                from[w] = u;
                sum[w] = sum[u] + value[w];
                stack.push_back(w);
            }
        }
    }
    printf("%lld\n", best);
}
