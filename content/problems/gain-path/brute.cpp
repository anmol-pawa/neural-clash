#include <bits/stdc++.h>
using namespace std;

// Small n only: for every pair of nodes, walk both up to their meeting point and add the gains.
int main() {
    int n;
    scanf("%d", &n);
    vector<long long> gain(n);
    vector<int> parent(n, -1), depth(n, 0);
    for (int v = 0; v < n; ++v) {
        int l, r;
        scanf("%lld %d %d", &gain[v], &l, &r);
        if (l >= 0) parent[l] = v;
        if (r >= 0) parent[r] = v;
    }
    for (int v = 1; v < n; ++v) depth[v] = depth[parent[v]] + 1;  // parent index < child index
    long long best = LLONG_MIN;
    for (int a = 0; a < n; ++a)
        for (int b = a; b < n; ++b) {
            int x = a, y = b;
            long long sum = 0;
            while (x != y) {
                if (depth[x] >= depth[y]) { sum += gain[x]; x = parent[x]; }
                else { sum += gain[y]; y = parent[y]; }
            }
            sum += gain[x];
            best = max(best, sum);
        }
    printf("%lld\n", best);
}
