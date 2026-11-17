#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    scanf("%d", &n);
    vector<long long> gain(n);
    vector<int> left(n), right(n);
    for (int v = 0; v < n; ++v) scanf("%lld %d %d", &gain[v], &left[v], &right[v]);

    // Children have larger indices than their parent, so n-1 .. 0 visits children first.
    vector<long long> down(n);  // best sum of a downward chain that starts at v
    long long best = LLONG_MIN;
    for (int v = n - 1; v >= 0; --v) {
        const long long l = left[v] >= 0 ? max(0LL, down[left[v]]) : 0;
        const long long r = right[v] >= 0 ? max(0LL, down[right[v]]) : 0;
        best = max(best, gain[v] + l + r);  // path that bends at v
        down[v] = gain[v] + max(l, r);      // chain that continues upward through v
    }
    printf("%lld\n", best);
}
