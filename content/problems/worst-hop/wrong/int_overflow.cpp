#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    scanf("%d", &n);
    vector<int> parent(n, -1), weight(n, 0), top1(n, 0), top2(n, 0);
    for (int i = 1; i < n; ++i) scanf("%d %d", &parent[i], &weight[i]);
    long long best = 0;
    for (int v = n - 1; v >= 0; --v) {
        best = max<long long>(best, top1[v] + top2[v]);
        if (v == 0) break;
        const int viaV = top1[v] + weight[v];  // Bug: 32-bit sums overflow on heavy chains
        int& a = top1[parent[v]];
        int& b = top2[parent[v]];
        if (viaV > a) { b = a; a = viaV; } else if (viaV > b) b = viaV;
    }
    printf("%lld\n", best);
}
