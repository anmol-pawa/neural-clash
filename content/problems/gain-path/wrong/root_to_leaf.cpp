#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    scanf("%d", &n);
    vector<long long> gain(n);
    vector<int> left(n), right(n);
    for (int v = 0; v < n; ++v) scanf("%lld %d %d", &gain[v], &left[v], &right[v]);
    vector<long long> down(n);
    for (int v = n - 1; v >= 0; --v) {
        long long c = LLONG_MIN;
        if (left[v] >= 0) c = max(c, down[left[v]]);
        if (right[v] >= 0) c = max(c, down[right[v]]);
        // bug: a chain must end at a leaf and start at the root, so a bend or a start below the root is never used
        down[v] = gain[v] + (c == LLONG_MIN ? 0 : c);
    }
    printf("%lld\n", down[0]);
}
