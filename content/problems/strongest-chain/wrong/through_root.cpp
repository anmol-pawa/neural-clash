#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    scanf("%d", &n);
    vector<long long> value(n);
    for (auto& x : value) scanf("%lld", &x);
    vector<int> parent(n, -1);
    for (int i = 1; i < n; ++i) scanf("%d", &parent[i]);
    vector<long long> top1(n, 0), top2(n, 0);
    for (int v = n - 1; v >= 1; --v) {
        const long long gain = value[v] + top1[v];
        if (gain <= 0) continue;
        long long& a = top1[parent[v]];
        long long& b = top2[parent[v]];
        if (gain > a) { b = a; a = gain; }
        else if (gain > b) { b = gain; }
    }
    // bug: only the chain whose highest node is the root is considered
    printf("%lld\n", value[0] + top1[0] + top2[0]);
}
