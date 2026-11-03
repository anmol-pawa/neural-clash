#include <bits/stdc++.h>
using namespace std;

// Bug: assumes a perfect split exists, so answers ceil(total / b) (or the max) without checking order.
int main() {
    int n, b;
    scanf("%d %d", &n, &b);
    long long total = 0, mx = 0;
    for (int i = 0; i < n; ++i) {
        long long x;
        scanf("%lld", &x);
        total += x;
        mx = max(mx, x);
    }
    printf("%lld\n", max(mx, (total + b - 1) / b));
}
