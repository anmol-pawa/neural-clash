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
    long long best = -1;
    int bestCount = 0;
    for (const auto& [value, count] : freq)
        if (count > bestCount) { bestCount = count; best = value; }
    printf("%lld\n", best);  // bug: the most common label is not necessarily a majority
}
