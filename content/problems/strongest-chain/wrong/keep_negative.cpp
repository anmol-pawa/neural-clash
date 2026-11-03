#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    scanf("%d", &n);
    vector<long long> value(n);
    for (auto& x : value) scanf("%lld", &x);
    vector<int> parent(n, -1);
    for (int i = 1; i < n; ++i) scanf("%d", &parent[i]);
    const long long NEG = LLONG_MIN / 4;
    vector<long long> top1(n, NEG), top2(n, NEG);
    long long best = LLONG_MIN;
    for (int v = n - 1; v >= 0; --v) {
        // bug: a missing child counts as 0 but a negative child chain is still added
        const long long a = top1[v] == NEG ? 0 : top1[v];
        const long long b = top2[v] == NEG ? 0 : top2[v];
        best = max(best, value[v] + a + b);
        if (v == 0) break;
        const long long gain = value[v] + a;
        long long& x = top1[parent[v]];
        long long& y = top2[parent[v]];
        if (gain > x) { y = x; x = gain; }
        else if (gain > y) { y = gain; }
    }
    printf("%lld\n", best);
}
