#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    scanf("%d", &n);
    vector<int> parent(n, -1);
    vector<long long> weight(n, 0), down(n, 0);
    for (int i = 1; i < n; ++i) scanf("%d %lld", &parent[i], &weight[i]);
    for (int v = n - 1; v >= 1; --v) down[parent[v]] = max(down[parent[v]], down[v] + weight[v]);
    // Bug: only the two best branches of the root are combined.
    long long a = 0, b = 0;
    for (int v = 1; v < n; ++v) {
        if (parent[v] != 0) continue;
        const long long x = down[v] + weight[v];
        if (x > a) { b = a; a = x; } else if (x > b) b = x;
    }
    printf("%lld\n", a + b);
}
