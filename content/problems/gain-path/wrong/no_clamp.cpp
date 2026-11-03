#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    scanf("%d", &n);
    vector<long long> gain(n);
    vector<int> left(n), right(n);
    for (int v = 0; v < n; ++v) scanf("%lld %d %d", &gain[v], &left[v], &right[v]);
    vector<long long> down(n);
    long long best = LLONG_MIN;
    for (int v = n - 1; v >= 0; --v) {
        // bug: a negative chain is added anyway instead of being skipped
        const long long l = left[v] >= 0 ? down[left[v]] : 0;
        const long long r = right[v] >= 0 ? down[right[v]] : 0;
        best = max(best, gain[v] + l + r);
        down[v] = gain[v] + max(l, r);
    }
    printf("%lld\n", best);
}
