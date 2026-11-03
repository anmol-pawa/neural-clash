#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    scanf("%d", &n);
    vector<int> parent(n, -1);
    vector<long long> weight(n, 0);
    for (int i = 1; i < n; ++i) scanf("%d %lld", &parent[i], &weight[i]);

    // top1[v], top2[v]: the two largest values of (down[c] + w(c)) over children c of v.
    // Because parent[i] < i, walking i = n-1 .. 1 finalises every node before its parent.
    vector<long long> top1(n, 0), top2(n, 0);
    long long best = 0;
    for (int v = n - 1; v >= 0; --v) {
        best = max(best, top1[v] + top2[v]);  // the path bending at v
        if (v == 0) break;
        const long long viaV = top1[v] + weight[v];  // longest downward path from parent[v] through v
        long long& a = top1[parent[v]];
        long long& b = top2[parent[v]];
        if (viaV > a) { b = a; a = viaV; }
        else if (viaV > b) { b = viaV; }
    }
    printf("%lld\n", best);
}
