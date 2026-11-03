#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    scanf("%d", &n);
    map<long long, int> freq;
    for (int i = 0; i < n; ++i) {
        long long x;
        scanf("%lld", &x);
        ++freq[x];
    }
    long long ans = -1;
    for (const auto& [value, count] : freq)
        if (count * 2 > n) ans = value;
    printf("%lld\n", ans);
}
