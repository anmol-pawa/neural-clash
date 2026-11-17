#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    scanf("%d", &n);
    vector<long long> value(n);
    for (auto& x : value) scanf("%lld", &x);
    vector<int> parent(n, -1);
    for (int i = 1; i < n; ++i) scanf("%d", &parent[i]);

    // top1[v] >= top2[v] are the two largest non-negative downward gains among v's children.
    vector<long long> top1(n, 0), top2(n, 0);
    long long best = LLONG_MIN;
    for (int v = n - 1; v >= 0; --v) {  // parent[v] < v, so children are finished before their parent
        best = max(best, value[v] + top1[v] + top2[v]);  // v is the highest node of this chain
        const long long gain = value[v] + top1[v];       // best chain starting at v and going down
        if (v == 0 || gain <= 0) continue;               // a non-positive chain is never worth extending
        long long& a = top1[parent[v]];
        long long& b = top2[parent[v]];
        if (gain > a) { b = a; a = gain; }
        else if (gain > b) { b = gain; }
    }
    printf("%lld\n", best);
}
